<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Seat;
use App\Models\SeatChangeRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;

class SeatChangeController extends Controller
{
    /**
     * Preview the payment adjustment for a prospective seat change WITHOUT creating it.
     * POST /api/seat-change-requests/preview  { to_seat_id }
     */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'to_seat_id' => 'required|exists:seats,id',
        ]);

        $user = $request->user();
        $toSeat = Seat::with('room.branch')->findOrFail($data['to_seat_id']);
        $active = $user->allocations()->where('status', 'active')->with('seat.room.branch')->first();

        if (!$active) {
            return response()->json(['message' => 'You have no active allocation to change from.'], 422);
        }

        $fromSeat = $active->seat;
        $balance = $user->balance();
        $oldRate = (float) $active->price_per_day;
        $newRate = (float) $toSeat->price_per_day;

        // Remaining days: if booking has an end_date use it; else derive from balance coverage
        if ($active->end_date) {
            $remainingDays = max(0, (int) Carbon::today()->diffInDays(Carbon::parse($active->end_date)) + 1);
        } else {
            $remainingDays = $oldRate > 0 ? (int) floor($balance / $oldRate) : 0;
        }

        $newRemainingCost = round($remainingDays * $newRate, 2);
        $payable = round(max(0, $newRemainingCost - $balance), 2);
        $excess = round(max(0, $balance - $newRemainingCost), 2);

        $type = $fromSeat->room->branch_id === $toSeat->room->branch_id ? 'same_branch' : 'different_branch';

        return response()->json([
            'from_seat' => $fromSeat->load('room.branch'),
            'to_seat' => $toSeat,
            'type' => $type,
            'old_rate' => $oldRate,
            'new_rate' => $newRate,
            'remaining_days' => $remainingDays,
            'balance_before' => $balance,
            'new_remaining_cost' => $newRemainingCost,
            'payable_amount' => $payable,
            'excess_carry_forward' => $excess,
            'note' => $excess > 0
                ? "Excess {$excess} BDT will be adjusted with future rent (no refund)."
                : ($payable > 0 ? "You need to pay {$payable} BDT extra for the remaining period." : 'No payment adjustment needed.'),
        ]);
    }

    public function index(Request $request)
    {
        $requests = $request->user()
            ->seatChangeRequests()
            ->with(['fromSeat.room.branch', 'toSeat.room.branch', 'admin'])
            ->latest()
            ->get();

        return response()->json($requests);
    }

    public function show(Request $request, $id)
    {
        $req = $request->user()->seatChangeRequests()->with(['fromSeat.room.branch', 'toSeat.room.branch', 'admin'])->findOrFail($id);

        return response()->json($req);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'to_seat_id' => 'required|exists:seats,id',
            'requested_date' => 'sometimes|date|after_or_equal:today',
            'note' => 'sometimes|string|nullable',
        ]);

        $user = $request->user();
        $toSeat = Seat::with('room.branch')->findOrFail($data['to_seat_id']);
        $active = $user->allocations()->where('status', 'active')->with('seat.room.branch')->first();

        if (!$active) {
            return response()->json(['message' => 'You have no active allocation to change from.'], 422);
        }

        if ($toSeat->status !== 'available') {
            return response()->json(['message' => 'The selected seat is not available.'], 422);
        }

        // Prevent duplicate pending request
        if ($user->seatChangeRequests()->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'You already have a pending seat change request.'], 422);
        }

        $fromSeat = $active->seat;
        $balance = $user->balance();
        $oldRate = (float) $active->price_per_day;
        $newRate = (float) $toSeat->price_per_day;

        if ($active->end_date) {
            $remainingDays = max(0, (int) Carbon::today()->diffInDays(Carbon::parse($active->end_date)) + 1);
        } else {
            $remainingDays = $oldRate > 0 ? (int) floor($balance / $oldRate) : 0;
        }

        $newRemainingCost = round($remainingDays * $newRate, 2);
        $payable = round(max(0, $newRemainingCost - $balance), 2);

        $type = $fromSeat->room->branch_id === $toSeat->room->branch_id ? 'same_branch' : 'different_branch';

        $scr = SeatChangeRequest::create([
            'user_id' => $user->id,
            'from_seat_id' => $fromSeat->id,
            'to_seat_id' => $toSeat->id,
            'type' => $type,
            'requested_date' => $data['requested_date'] ?? Carbon::today()->toDateString(),
            'balance_before' => $balance,
            'payable_amount' => $payable,
            'status' => 'pending',
            'note' => $data['note'] ?? null,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'seat_change',
            'title' => 'Seat Change Request Submitted',
            'body' => "Your request to move from {$fromSeat->label} to {$toSeat->label} is pending admin approval. Payable: {$payable} BDT.",
        ]);

        return response()->json([
            'message' => 'Seat change request submitted. Pending admin approval.',
            'request' => $scr->load(['fromSeat.room.branch', 'toSeat.room.branch']),
        ], 201);
    }
}


