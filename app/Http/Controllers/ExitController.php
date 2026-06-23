<?php

namespace App\Http\Controllers;

use App\Models\ExitRequest;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ExitController extends Controller
{
    /**
     * Preview final settlement without submitting.
     * POST /api/exit-requests/preview { requested_exit_date }
     */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'requested_exit_date' => 'required|date|after_or_equal:today',
        ]);

        $user = $request->user();
        $exitDate = Carbon::parse($data['requested_exit_date']);
        $noticeDays = (int) $user->notice_period_days;
        $today = Carbon::today();
        $daysUntilExit = (int) $today->diffInDays($exitDate, false);

        $noticeValid = $daysUntilExit >= $noticeDays;

        // Rent payable = consumed rent up to exit date minus already paid (credits)
        $consumedUpToExit = $this->consumedRentUpTo($user, $exitDate);
        $credits = (float) $user->payments()->where('direction', 'credit')->where('status', 'paid')->sum('amount');
        $rentPayable = round(max(0, $consumedUpToExit - $credits), 2);

        // Deposit refundable: full deposit minus any outstanding rent
        $deposit = (float) $user->deposit_held;
        $depositRefundable = round(max(0, $deposit - $rentPayable), 2);

        // Net: positive = user pays admin, negative = admin refunds user (deposit only; no rent refund)
        $net = round($rentPayable - $depositRefundable, 2);

        return response()->json([
            'requested_exit_date' => $exitDate->toDateString(),
            'notice_period_days' => $noticeDays,
            'days_until_exit' => $daysUntilExit,
            'notice_valid' => $noticeValid,
            'consumed_rent_up_to_exit' => $consumedUpToExit,
            'total_paid_credits' => $credits,
            'rent_payable' => $rentPayable,
            'deposit_held' => $deposit,
            'deposit_refundable' => $depositRefundable,
            'net_payable' => $net,
            'note' => $net >= 0
                ? "You need to pay {$net} BDT at exit."
                : "You will receive " . abs($net) . " BDT (deposit refund) at exit. No rent refund.",
        ]);
    }

    public function index(Request $request)
    {
        return response()->json(
            $request->user()->exitRequests()->with('admin')->latest()->get()
        );
    }

    public function show(Request $request, $id)
    {
        return response()->json(
            $request->user()->exitRequests()->with('admin')->findOrFail($id)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'requested_exit_date' => 'required|date|after_or_equal:today',
            'reason' => 'sometimes|string|nullable',
        ]);

        $user = $request->user();

        if ($user->exitRequests()->where('status', 'pending')->exists()) {
            return response()->json(['message' => 'You already have a pending exit request.'], 422);
        }

        $exitDate = Carbon::parse($data['requested_exit_date']);
        $noticeDays = (int) $user->notice_period_days;
        $daysUntilExit = (int) Carbon::today()->diffInDays($exitDate, false);
        $noticeValid = $daysUntilExit >= $noticeDays;

        if (!$noticeValid) {
            return response()->json([
                'message' => "Notice period not satisfied. You must give at least {$noticeDays} days notice. Requested exit is in {$daysUntilExit} days.",
            ], 422);
        }

        $consumedUpToExit = $this->consumedRentUpTo($user, $exitDate);
        $credits = (float) $user->payments()->where('direction', 'credit')->where('status', 'paid')->sum('amount');
        $rentPayable = round(max(0, $consumedUpToExit - $credits), 2);
        $deposit = (float) $user->deposit_held;
        $depositRefundable = round(max(0, $deposit - $rentPayable), 2);
        $net = round($rentPayable - $depositRefundable, 2);

        $exit = ExitRequest::create([
            'user_id' => $user->id,
            'requested_exit_date' => $exitDate->toDateString(),
            'notice_period_days' => $noticeDays,
            'notice_valid' => $noticeValid,
            'reason' => $data['reason'] ?? null,
            'rent_payable' => $rentPayable,
            'deposit_refundable' => $depositRefundable,
            'net_payable' => $net,
            'status' => 'pending',
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'exit',
            'title' => 'Exit Request Submitted',
            'body' => "Your exit request for {$exitDate->toDateString()} is pending admin approval. Net payable: {$net} BDT.",
        ]);

        return response()->json([
            'message' => 'Exit request submitted. Pending admin approval.',
            'exit' => $exit,
        ], 201);
    }

    /**
     * Compute consumed rent up to a given exit date.
     */
    private function consumedRentUpTo($user, Carbon $exitDate): float
    {
        $total = 0;
        $exitStr = $exitDate->toDateString();

        foreach ($user->allocations as $alloc) {
            $start = $alloc->start_date->toDateString();
            $end = $alloc->end_date?->toDateString() ?? $exitStr;
            if ($end > $exitStr) {
                $end = $exitStr;
            }
            if ($end < $start) {
                continue;
            }
            $days = (int) Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;
            $total += $days * (float) $alloc->price_per_day;
        }

        return round($total, 2);
    }
}
