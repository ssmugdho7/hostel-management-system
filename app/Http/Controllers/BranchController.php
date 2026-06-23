<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index()
    {
        return response()->json(Branch::with('rooms.seats')->get());
    }

    public function show(Branch $branch)
    {
        return response()->json($branch->load('rooms.seats'));
    }
}
