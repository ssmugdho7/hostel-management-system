<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'requested_exit_date', 'notice_period_days', 'notice_valid', 'reason', 'rent_payable', 'deposit_refundable', 'net_payable', 'status', 'admin_id', 'approved_at'])]
class ExitRequest extends Model
{
    protected $casts = [
        'requested_exit_date' => 'date',
        'notice_period_days' => 'integer',
        'notice_valid' => 'boolean',
        'rent_payable' => 'decimal:2',
        'deposit_refundable' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
