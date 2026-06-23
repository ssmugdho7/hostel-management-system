<?php

use App\Http\Controllers\Admin\AdminAnnouncementController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminExitController;
use App\Http\Controllers\Admin\AdminLeaveController;
use App\Http\Controllers\Admin\AdminSeatChangeController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExitController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RentController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\SeatChangeController;
use App\Http\Controllers\SeatController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Auth
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// CSRF cookie for Sanctum SPA
Route::get('/sanctum/csrf-cookie', fn () => response()->json(['message' => 'CSRF cookie set']));

/*
|--------------------------------------------------------------------------
| Authenticated Routes (Sanctum SPA)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Branches / Rooms / Seats (read-only for customers)
    Route::get('/branches', [BranchController::class, 'index']);
    Route::get('/branches/{branch}', [BranchController::class, 'show']);
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{room}', [RoomController::class, 'show']);
    Route::get('/seats', [SeatController::class, 'index']);
    Route::get('/seats/{seat}', [SeatController::class, 'show']);

    // Seat Change Requests
    Route::post('/seat-change-requests/preview', [SeatChangeController::class, 'preview']);
    Route::get('/seat-change-requests', [SeatChangeController::class, 'index']);
    Route::post('/seat-change-requests', [SeatChangeController::class, 'store']);
    Route::get('/seat-change-requests/{id}', [SeatChangeController::class, 'show']);

    // Rent
    Route::get('/rent/bills', [RentController::class, 'bills']);
    Route::get('/rent/history', [RentController::class, 'history']);
    Route::post('/rent/pay', [RentController::class, 'pay']);

    // Leave
    Route::get('/leave-applications', [LeaveController::class, 'index']);
    Route::post('/leave-applications', [LeaveController::class, 'store']);
    Route::get('/leave-applications/{id}', [LeaveController::class, 'show']);

    // Exit
    Route::post('/exit-requests/preview', [ExitController::class, 'preview']);
    Route::get('/exit-requests', [ExitController::class, 'index']);
    Route::post('/exit-requests', [ExitController::class, 'store']);
    Route::get('/exit-requests/{id}', [ExitController::class, 'show']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Announcements
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('is_admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);

        // Seat Changes
        Route::get('/seat-change-requests', [AdminSeatChangeController::class, 'index']);
        Route::put('/seat-change-requests/{id}/approve', [AdminSeatChangeController::class, 'approve']);
        Route::put('/seat-change-requests/{id}/reject', [AdminSeatChangeController::class, 'reject']);

        // Leave
        Route::get('/leave-applications', [AdminLeaveController::class, 'index']);
        Route::put('/leave-applications/{id}/approve', [AdminLeaveController::class, 'approve']);
        Route::put('/leave-applications/{id}/reject', [AdminLeaveController::class, 'reject']);

        // Exit
        Route::get('/exit-requests', [AdminExitController::class, 'index']);
        Route::put('/exit-requests/{id}/approve', [AdminExitController::class, 'approve']);
        Route::put('/exit-requests/{id}/reject', [AdminExitController::class, 'reject']);

        // Announcements
        Route::get('/announcements', [AdminAnnouncementController::class, 'index']);
        Route::post('/announcements', [AdminAnnouncementController::class, 'store']);
        Route::delete('/announcements/{id}', [AdminAnnouncementController::class, 'destroy']);
    });
});
