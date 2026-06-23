<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        return response()->json(Announcement::published()->latest()->get());
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }
}
