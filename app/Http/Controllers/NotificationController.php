<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $personal = $user->notifications()->latest()->get();
        $broadcast = Notification::whereNull('user_id')->latest()->limit(20)->get();

        return response()->json([
            'notifications' => $personal->merge($broadcast)->sortByDesc('created_at')->values(),
            'unread_count' => $user->notifications()->unread()->count(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $user = $request->user();
        $notification = $user->notifications()->findOrFail($id);
        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->notifications()->unread()->update(['read_at' => now()]);

        return response()->json(['message' => 'All marked as read']);
    }
}
