<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['room_id', 'label', 'price_per_day', 'status'])]
class Seat extends Model
{
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    public function branch()
    {
        return $this->hasOneThrough(Branch::class, Room::class, 'id', 'id', 'room_id', 'branch_id');
    }
}
