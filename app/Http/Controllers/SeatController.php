<?php

namespace App\Http\Controllers;

use App\Models\Seat;
use Illuminate\Http\Request;

class SeatController extends Controller
{
    public function index(Request $request)
    {
        $query = Seat::with(['room.branch']);

        if ($request->boolean('available_only')) {
            $query->where('status', 'available');
        }

        if ($request->has('branch_id')) {
            $query->whereHas('room', fn ($q) => $q->where('branch_id', $request->branch_id));
        }

        if ($request->has('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        return response()->json($query->get());
    }

    public function show(Seat $seat)
    {
        return response()->json($seat->load('room.branch'));
    }
}
