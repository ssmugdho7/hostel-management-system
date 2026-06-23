<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'from_seat_id', 'to_seat_id', 'type', 'requested_date', 'balance_before', 'payable_amount', 'status', 'admin_id', 'approved_at', 'note'])]
class SeatChangeRequest extends Model
{
    protected $casts = [
        'requested_date' => 'date',
        'balance_before' => 'decimal:2',
        'payable_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fromSeat(): BelongsTo
    {
        return $this->belongsTo(Seat::class, 'from_seat_id');
    }

    public function toSeat(): BelongsTo
    {
        return $this->belongsTo(Seat::class, 'to_seat_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
