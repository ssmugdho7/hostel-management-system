<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user()->load(['currentSeat.room.branch', 'activeAllocation.seat.room.branch']);

        $activeAllocation = $user->allocations()->where('status', 'active')->with('seat.room.branch')->first();
        $balance = $user->balance();
        $remainingDays = $user->remainingDaysCoverage();

        $dueBills = $user->rentBills()->whereIn('status', ['due', 'partial'])->orderBy('due_date')->get();
        $pendingSeatChanges = $user->seatChangeRequests()->where('status', 'pending')->count();
        $pendingLeaves = $user->leaveApplications()->where('status', 'pending')->count();
        $pendingExits = $user->exitRequests()->where('status', 'pending')->count();

        $unreadNotifications = $user->notifications()->unread()->count();
        $recentNotifications = $user->notifications()->latest()->limit(5)->get();

        $announcements = Announcement::published()->latest()->limit(5)->get();

        return response()->json([
            'user' => $user,
            'current_seat' => $user->currentSeat?->load('room.branch'),
            'active_allocation' => $activeAllocation,
            'balance' => $balance,
            'consumed_rent' => $user->consumedRent(),
            'remaining_days_coverage' => $remainingDays,
            'due_bills' => $dueBills,
            'summary' => [
                'pending_seat_changes' => $pendingSeatChanges,
                'pending_leaves' => $pendingLeaves,
                'pending_exits' => $pendingExits,
                'unread_notifications' => $unreadNotifications,
            ],
            'recent_notifications' => $recentNotifications,
            'announcements' => $announcements,
        ]);
    }
}
