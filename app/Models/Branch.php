<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'address', 'phone'])]
class Branch extends Model
{
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function seats()
    {
        return $this->hasManyThrough(Seat::class, Room::class);
    }
}
