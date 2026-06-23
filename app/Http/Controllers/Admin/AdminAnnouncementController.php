<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminAnnouncementController extends Controller
{
    public function index()
    {
        return response()->json(Announcement::latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'body' => 'required|string',
            'audience' => 'sometimes|in:all,customers',
        ]);

        $announcement = Announcement::create([
            'title' => $data['title'],
            'body' => $data['body'],
            'audience' => $data['audience'] ?? 'all',
            'published_at' => Carbon::now(),
        ]);

        $customers = User::where('role', 'customer')->get();
        foreach ($customers as $customer) {
            Notification::create([
                'user_id' => $customer->id,
                'type' => 'announcement',
                'title' => $announcement->title,
                'body' => $announcement->body,
            ]);
        }

        return response()->json(['message' => 'Announcement published.', 'announcement' => $announcement], 201);
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}
