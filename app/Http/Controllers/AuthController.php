<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:20',
            'nid' => 'required|string|max:30',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'nid' => $data['nid'],
            'password' => $data['password'],
            'role' => 'customer',
            'status' => 'active',
            'notice_period_days' => 7,
            'deposit_held' => 0,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'announcement',
            'title' => 'Welcome to Hostel Management',
            'body' => 'Your account has been created. Please contact admin for seat allocation.',
        ]);

        return response()->json(['message' => 'Registration successful. Please login.', 'user' => $user], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'user' => $user->load('currentSeat.room.branch'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('currentSeat.room.branch'));
    }
}



