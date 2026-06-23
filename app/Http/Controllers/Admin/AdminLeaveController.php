<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LeaveApplication;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminLeaveController extends Controller
{
    public function index()
    {
        return response()->json(
            LeaveApplication::with(['user', 'admin'])->latest()->get()
        );
    }

    public function approve(Request $request, $id)
    {
        $leave = LeaveApplication::where('status', 'pending')->findOrFail($id);
        $leave->update([
            'status' => 'approved',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $leave->user_id,
            'type' => 'leave',
            'title' => 'Leave Approved',
            'body' => 'Your leave from ' . Carbon::parse($leave->start_date)->toDateString() . ' to ' . Carbon::parse($leave->end_date)->toDateString() . ' has been approved.',
        ]);

        return response()->json(['message' => 'Leave approved.', 'leave' => $leave->fresh()->load(['user', 'admin'])]);
    }

    public function reject(Request $request, $id)
    {
        $leave = LeaveApplication::where('status', 'pending')->findOrFail($id);
        $leave->update([
            'status' => 'rejected',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $leave->user_id,
            'type' => 'leave',
            'title' => 'Leave Rejected',
            'body' => 'Your leave application has been rejected.',
        ]);

        return response()->json(['message' => 'Leave rejected.', 'leave' => $leave->fresh()->load(['user', 'admin'])]);
    }
}
