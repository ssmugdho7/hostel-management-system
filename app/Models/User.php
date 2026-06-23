<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'phone', 'nid', 'role', 'status', 'notice_period_days', 'deposit_held', 'current_seat_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'deposit_held' => 'decimal:2',
            'notice_period_days' => 'integer',
        ];
    }

    public function currentSeat(): BelongsTo
    {
        return $this->belongsTo(Seat::class, 'current_seat_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    public function activeAllocation(): HasMany
    {
        return $this->hasMany(Allocation::class)->where('status', 'active');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function rentBills(): HasMany
    {
        return $this->hasMany(RentBill::class);
    }

    public function seatChangeRequests(): HasMany
    {
        return $this->hasMany(SeatChangeRequest::class);
    }

    public function leaveApplications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function exitRequests(): HasMany
    {
        return $this->hasMany(ExitRequest::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Ledger balance = total credits (money in) - total debits (money out consumed).
     * Credits: rent payments, deposits paid, adjustments in.
     * Debits: rent consumed for elapsed days on each active/ended allocation.
     */
    public function balance(): float
    {
        $credits = (float) $this->payments()->whereIn('direction', ['credit'])->where('status', 'paid')->sum('amount');
        $consumed = (float) $this->consumedRent();

        return round($credits - $consumed, 2);
    }

    /**
     * Total rent consumed for all allocations up to today (or end_date).
     * Each allocation: days_elapsed * price_per_day.
     */
    public function consumedRent(): float
    {
        $total = 0;
        $today = now()->toDateString();

        foreach ($this->allocations as $alloc) {
            $end = $alloc->end_date?->toDateString() ?? $today;
            // do not count future days beyond today for active allocations
            if ($alloc->status === 'active' && $end > $today) {
                $end = $today;
            }
            $start = $alloc->start_date->toDateString();
            if ($end < $start) {
                continue;
            }
            $days = (int) \Carbon\Carbon::parse($start)->diffInDays(\Carbon\Carbon::parse($end)) + 1;
            $total += $days * (float) $alloc->price_per_day;
        }

        return round($total, 2);
    }

    /**
     * Remaining days coverage based on current balance and active allocation rate.
     */
    public function remainingDaysCoverage(): int
    {
        $active = $this->allocations()->where('status', 'active')->first();
        if (!$active) {
            return 0;
        }
        $rate = (float) $active->price_per_day;
        if ($rate <= 0) {
            return 0;
        }

        return (int) floor($this->balance() / $rate);
    }
}
