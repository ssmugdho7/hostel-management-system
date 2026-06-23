<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExitRequest;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Seat;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminExitController extends Controller
{
    public function index()
    {
        return response()->json(
            ExitRequest::with(['user', 'admin'])->latest()->get()
        );
    }

    public function approve(Request $request, $id)
    {
        $exit = ExitRequest::where('status', 'pending')->findOrFail($id);
        $user = $exit->user;

        $active = $user->allocations()->where('status', 'active')->first();
        if ($active) {
            $active->update([
                'end_date' => Carbon::parse($exit->requested_exit_date),
                'status' => 'ended',
                'reason' => 'exit',
            ]);
        }

        if ($user->current_seat_id) {
            Seat::where('id', $user->current_seat_id)->update(['status' => 'available']);
        }

        if ($exit->deposit_refundable > 0) {
            Payment::create([
                'user_id' => $user->id,
                'amount' => $exit->deposit_refundable,
                'type' => 'refund',
                'direction' => 'debit',
                'status' => 'paid',
                'method' => 'cash',
                'paid_at' => Carbon::now(),
                'note' => 'Deposit refund on exit #' . $exit->id,
            ]);
        }

        if ($exit->net_payable > 0) {
            Payment::create([
                'user_id' => $user->id,
                'amount' => $exit->net_payable,
                'type' => 'rent',
                'direction' => 'credit',
                'status' => 'pending',
                'method' => 'due',
                'note' => 'Net payable on exit #' . $exit->id,
            ]);
        }

        $user->update(['status' => 'exited', 'current_seat_id' => null]);

        $exit->update([
            'status' => 'approved',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'exit',
            'title' => 'Exit Approved',
            'body' => "Your exit has been approved. " . ($exit->net_payable >= 0 ? "Payable: {$exit->net_payable} BDT." : 'Refund: ' . abs($exit->net_payable) . ' BDT.'),
        ]);

        return response()->json(['message' => 'Exit approved and settled.', 'exit' => $exit->fresh()->load(['user', 'admin'])]);
    }

    public function reject(Request $request, $id)
    {
        $exit = ExitRequest::where('status', 'pending')->findOrFail($id);
        $exit->update([
            'status' => 'rejected',
            'admin_id' => $request->user()->id,
            'approved_at' => Carbon::now(),
        ]);

        Notification::create([
            'user_id' => $exit->user_id,
            'type' => 'exit',
            'title' => 'Exit Request Rejected',
            'body' => 'Your exit request has been rejected.',
        ]);

        return response()->json(['message' => 'Exit rejected.', 'exit' => $exit->fresh()->load(['user', 'admin'])]);
    }
}
