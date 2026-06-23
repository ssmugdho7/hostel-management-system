<?php

namespace App\Http\Controllers;

use App\Models\LeaveApplication;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->leaveApplications()->with('admin')->latest()->get()
        );
    }

    public function show(Request $request, $id)
    {
        return response()->json(
            $request->user()->leaveApplications()->with('admin')->findOrFail($id)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:1000',
        ]);

        $user = $request->user();

        $leave = LeaveApplication::create([
            'user_id' => $user->id,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'reason' => $data['reason'],
            'status' => 'pending',
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'leave',
            'title' => 'Leave Application Submitted',
            'body' => 'Your leave application from ' . Carbon::parse($data['start_date'])->toDateString() . ' to ' . Carbon::parse($data['end_date'])->toDateString() . ' is pending admin approval.',
        ]);

        return response()->json([
            'message' => 'Leave application submitted. Pending admin approval.',
            'leave' => $leave,
        ], 201);
    }
}
