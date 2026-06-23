<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Allocation;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Seat;
use App\Models\SeatChangeRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminSeatChangeController extends Controller
{
    public function index()
    {
        return response()->json(
            SeatChangeRequest::with(['user', 'fromSeat.room.branch', 'toSeat.room.branch', 'admin'])->latest()->get()
        );
    }

    public function approve(Request $request, $id)
    {
        $req = SeatChangeRequest::where('status', 'pending')->findOrFail($id);
        $user = $req->user;

        $toSeat = Seat::findOrFail($req->to_seat_id);
        if ($toSeat->status !== 'available') {
            return response()->json(['message' => 'Target seat is no longer available.'], 422);
        }

        $active = $user->allocations()->where('status', 'active')->first();
        if ($active) {
            $active->update(['end_date' => Carbon::yesterday(), 'status' => 'ended']);
        }

        Seat::where('id', $req->from_seat_id)->update(['status' => 'available']);
        $toSeat->update(['status' => 'occupied']);
        $user->update(['current_seat_id' => $toSeat->id]);

        $newAlloc = Allocation::create([
            'user_id' => $user->id,
            'seat_id' => $toSeat->id,
            'price_per_day' => $toSeat->price_per_day,
            'start_date' => Carbon::today(),
            'end_date' => null,
            'status' => 'active',
            'reason' => 'seat_change',
        ]);

        if ($req->payable_amount > 0) {
            Payment::create([
                'user_id' => $user->id,
                'allocation_id' => $newAlloc->id,
                'amount' => $req->payable_amount,
                'type' => 'rent',
                'direction' => 'credit',
                'status' => 'pending',
                'method' => 'due',
                'note' => 'Payable for seat change #' . $req->id,
            ]);
        }

        $req->update([
            'status' => 'approved',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'seat_change',
            'title' => 'Seat Change Approved',
            'body' => "Your seat has been changed to {$toSeat->label}. " . ($req->payable_amount > 0 ? "Payable: {$req->payable_amount} BDT." : 'No additional payment needed.'),
        ]);

        return response()->json([
            'message' => 'Seat change approved and applied.',
            'request' => $req->fresh()->load(['user', 'fromSeat.room.branch', 'toSeat.room.branch', 'admin']),
        ]);
    }

    public function reject(Request $request, $id)
    {
        $req = SeatChangeRequest::where('status', 'pending')->findOrFail($id);
        $req->update([
            'status' => 'rejected',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
            'note' => ($req->note ? $req->note . "\n" : '') . 'Rejected: ' . ($request->input('reason', 'Not eligible.')),
        ]);

        Notification::create([
            'user_id' => $req->user_id,
            'type' => 'seat_change',
            'title' => 'Seat Change Rejected',
            'body' => 'Your seat change request has been rejected.',
        ]);

        return response()->json(['message' => 'Seat change rejected.', 'request' => $req->fresh()]);
    }
}
