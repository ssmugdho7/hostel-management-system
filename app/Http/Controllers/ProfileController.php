<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load(['currentSeat.room.branch', 'activeAllocation']);

        return response()->json([
            'user' => $user,
            'current_seat' => $user->currentSeat?->load('room.branch'),
            'active_allocation' => $user->allocations()->where('status', 'active')->with('seat.room.branch')->first(),
            'balance' => $user->balance(),
            'consumed_rent' => $user->consumedRent(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'phone' => 'sometimes|required|string|max:20',
            'nid' => 'sometimes|required|string|max:30',
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json([
            'message' => 'Profile updated',
            'user' => $user->fresh()->load('currentSeat.room.branch'),
        ]);
    }
}
