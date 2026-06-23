<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Seat;
use App\Models\SeatChangeRequest;
use App\Models\LeaveApplication;
use App\Models\ExitRequest;
use App\Models\User;

class AdminDashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'stats' => [
                'total_customers' => User::where('role', 'customer')->count(),
                'active_customers' => User::where('role', 'customer')->where('status', 'active')->count(),
                'available_seats' => Seat::where('status', 'available')->count(),
                'occupied_seats' => Seat::where('status', 'occupied')->count(),
                'pending_seat_changes' => SeatChangeRequest::where('status', 'pending')->count(),
                'pending_leaves' => LeaveApplication::where('status', 'pending')->count(),
                'pending_exits' => ExitRequest::where('status', 'pending')->count(),
            ],
            'pending_seat_changes' => SeatChangeRequest::where('status', 'pending')->with(['user', 'fromSeat.room.branch', 'toSeat.room.branch'])->latest()->get(),
            'pending_leaves' => LeaveApplication::where('status', 'pending')->with('user')->latest()->get(),
            'pending_exits' => ExitRequest::where('status', 'pending')->with('user')->latest()->get(),
        ]);
    }
}
