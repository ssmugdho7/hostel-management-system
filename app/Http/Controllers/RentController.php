<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Payment;
use App\Models\RentBill;
use Carbon\Carbon;
use Illuminate\Http\Request;

class RentController extends Controller
{
    public function bills(Request $request)
    {
        $bills = $request->user()->rentBills()->latest()->get();

        return response()->json([
            'bills' => $bills,
            'current_balance' => $request->user()->balance(),
            'consumed_rent' => $request->user()->consumedRent(),
            'remaining_days_coverage' => $request->user()->remainingDaysCoverage(),
        ]);
    }

    public function history(Request $request)
    {
        $payments = $request->user()
            ->payments()
            ->with('allocation.seat.room.branch')
            ->latest('paid_at')
            ->get();

        return response()->json($payments);
    }

    public function pay(Request $request)
    {
        $data = $request->validate([
            'bill_id' => 'sometimes|exists:rent_bills,id',
            'amount' => 'required|numeric|min:1',
            'method' => 'sometimes|string|nullable',
        ]);

        $user = $request->user();
        $amount = (float) $data['amount'];

        $payment = Payment::create([
            'user_id' => $user->id,
            'allocation_id' => $user->allocations()->where('status', 'active')->value('id'),
            'amount' => $amount,
            'type' => 'rent',
            'direction' => 'credit',
            'status' => 'paid',
            'method' => $data['method'] ?? 'cash',
            'paid_at' => Carbon::now(),
            'note' => 'Rent payment',
        ]);

        // If a bill is referenced, update its status
        if (!empty($data['bill_id'])) {
            $bill = $user->rentBills()->find($data['bill_id']);
            if ($bill) {
                $bill->amount_paid += $amount;
                if ($bill->amount_paid >= $bill->amount_due) {
                    $bill->status = 'paid';
                    $bill->amount_paid = $bill->amount_due;
                } elseif ($bill->amount_paid > 0) {
                    $bill->status = 'partial';
                }
                $bill->save();
            }
        }

        Notification::create([
            'user_id' => $user->id,
            'type' => 'rent_reminder',
            'title' => 'Payment Received',
            'body' => "Your payment of {$amount} BDT has been received. New balance: {$user->balance()} BDT.",
        ]);

        return response()->json([
            'message' => 'Payment successful',
            'payment' => $payment,
            'new_balance' => $user->balance(),
        ]);
    }
}
