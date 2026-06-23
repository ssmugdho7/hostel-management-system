<?php

namespace Database\Seeders;

use App\Models\Allocation;
use App\Models\Announcement;
use App\Models\Branch;
use App\Models\LeaveApplication;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\RentBill;
use App\Models\Room;
use App\Models\Seat;
use App\Models\SeatChangeRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Branches ----------
        $branchA = Branch::create(['name' => 'Branch A (Main)', 'address' => '12 Mirpur Rd, Dhaka', 'phone' => '02-5550100']);
        $branchB = Branch::create(['name' => 'Branch B (North)', 'address' => '88 Uttara, Dhaka', 'phone' => '02-5550200']);

        // ---------- Rooms ----------
        $roomA1 = Room::create(['branch_id' => $branchA->id, 'name' => 'A-101', 'capacity' => 2]);
        $roomA2 = Room::create(['branch_id' => $branchA->id, 'name' => 'A-102', 'capacity' => 3]);
        $roomB1 = Room::create(['branch_id' => $branchB->id, 'name' => 'B-201', 'capacity' => 2]);

        // ---------- Seats ----------
        // Branch A room A1 (2-seat), 500/day
        $seatA1a = Seat::create(['room_id' => $roomA1->id, 'label' => 'A-101-Bed1', 'price_per_day' => 500, 'status' => 'occupied']);
        $seatA1b = Seat::create(['room_id' => $roomA1->id, 'label' => 'A-101-Bed2', 'price_per_day' => 500, 'status' => 'available']);
        // Branch A room A2 (3-seat), 300/day -- cheaper seat for change demo
        $seatA2a = Seat::create(['room_id' => $roomA2->id, 'label' => 'A-102-Bed1', 'price_per_day' => 300, 'status' => 'available']);
        $seatA2b = Seat::create(['room_id' => $roomA2->id, 'label' => 'A-102-Bed2', 'price_per_day' => 300, 'status' => 'available']);
        $seatA2c = Seat::create(['room_id' => $roomA2->id, 'label' => 'A-102-Bed3', 'price_per_day' => 300, 'status' => 'available']);
        // Branch B room B1 (2-seat), 450/day -- different branch change demo
        $seatB1a = Seat::create(['room_id' => $roomB1->id, 'label' => 'B-201-Bed1', 'price_per_day' => 450, 'status' => 'available']);
        $seatB1b = Seat::create(['room_id' => $roomB1->id, 'label' => 'B-201-Bed2', 'price_per_day' => 450, 'status' => 'available']);

        // ---------- Users ----------
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@hostel.test',
            'phone' => '01700000000',
            'nid' => 'ADMIN-NID-001',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'active',
        ]);

        // Demo customer: booked seat A1a (500/day), advance paid for ~10 days
        $customer = User::create([
            'name' => 'Rahim Uddin',
            'email' => 'rahim@hostel.test',
            'phone' => '01711122233',
            'nid' => '1990123456789',
            'password' => 'password123',
            'role' => 'customer',
            'status' => 'active',
            'notice_period_days' => 7,
            'deposit_held' => 2000,
            'current_seat_id' => $seatA1a->id,
        ]);

        // Another demo customer for variety
        $customer2 = User::create([
            'name' => 'Karim Ahmed',
            'email' => 'karim@hostel.test',
            'phone' => '01822233344',
            'nid' => '1995987654321',
            'password' => 'password123',
            'role' => 'customer',
            'status' => 'active',
            'notice_period_days' => 7,
            'deposit_held' => 1500,
            'current_seat_id' => $seatA1b->id,
        ]);
        $seatA1b->update(['status' => 'occupied']);

        // ---------- Allocations ----------
        // Rahim started 3 days ago on A1a @500/day, advance paid 5000
        $allocStart = Carbon::today()->subDays(3);
        Allocation::create([
            'user_id' => $customer->id,
            'seat_id' => $seatA1a->id,
            'price_per_day' => 500,
            'start_date' => $allocStart,
            'end_date' => null,
            'status' => 'active',
            'reason' => 'initial',
        ]);

        Allocation::create([
            'user_id' => $customer2->id,
            'seat_id' => $seatA1b->id,
            'price_per_day' => 500,
            'start_date' => Carbon::today()->subDays(10),
            'end_date' => null,
            'status' => 'active',
            'reason' => 'initial',
        ]);

        // ---------- Payments (advance) ----------
        // Rahim advance rent payment 5000 (covers 10 days @500)
        Payment::create([
            'user_id' => $customer->id,
            'allocation_id' => $customer->allocations()->where('status', 'active')->first()->id,
            'amount' => 5000,
            'type' => 'rent',
            'direction' => 'credit',
            'status' => 'paid',
            'method' => 'bkash',
            'paid_at' => $allocStart,
            'note' => 'Advance rent for 10 days',
        ]);
        // Rahim deposit 2000
        Payment::create([
            'user_id' => $customer->id,
            'allocation_id' => null,
            'amount' => 2000,
            'type' => 'deposit',
            'direction' => 'credit',
            'status' => 'paid',
            'method' => 'cash',
            'paid_at' => $allocStart,
            'note' => 'Security deposit',
        ]);

        Payment::create([
            'user_id' => $customer2->id,
            'amount' => 6000,
            'type' => 'rent',
            'direction' => 'credit',
            'status' => 'paid',
            'method' => 'nagad',
            'paid_at' => Carbon::today()->subDays(10),
            'note' => 'Advance rent',
        ]);

        // ---------- Rent Bills (current month) ----------
        $thisMonth = Carbon::today()->format('Y-m');
        RentBill::create([
            'user_id' => $customer->id,
            'period_month' => $thisMonth,
            'amount_due' => 5000,
            'amount_paid' => 5000,
            'due_date' => Carbon::today()->addDays(3),
            'status' => 'paid',
        ]);
        // A due bill for customer2 (due in 2 days -> triggers reminder)
        RentBill::create([
            'user_id' => $customer2->id,
            'period_month' => $thisMonth,
            'amount_due' => 6000,
            'amount_paid' => 0,
            'due_date' => Carbon::today()->addDays(2),
            'status' => 'due',
        ]);

        // ---------- Pending Seat Change Request (Rahim -> cheaper A2a @300) ----------
        $balance = $customer->balance(); // 5000 - 3*500 = 3500
        $active = $customer->allocations()->where('status', 'active')->first();
        $remainingDays = $active ? (int) Carbon::parse($active->start_date)->diffInDays(Carbon::today()) : 0;
        // remaining coverage from balance at new rate
        $newRate = 300;
        $payable = max(0, round($newRate * 10 - $balance, 2)); // 10-day target
        SeatChangeRequest::create([
            'user_id' => $customer->id,
            'from_seat_id' => $seatA1a->id,
            'to_seat_id' => $seatA2a->id,
            'type' => 'same_branch',
            'requested_date' => Carbon::today()->addDay(),
            'balance_before' => $balance,
            'payable_amount' => $payable,
            'status' => 'pending',
            'note' => 'Want to move to a cheaper 3-seat room.',
        ]);

        // ---------- Pending Leave Application (Rahim) ----------
        LeaveApplication::create([
            'user_id' => $customer->id,
            'start_date' => Carbon::today()->addDays(5),
            'end_date' => Carbon::today()->addDays(8),
            'reason' => 'Family wedding out of town.',
            'status' => 'pending',
        ]);

        // ---------- Notifications ----------
        Notification::create([
            'user_id' => $customer->id,
            'type' => 'rent_reminder',
            'title' => 'Rent Due Soon',
            'body' => 'Your rent for ' . $thisMonth . ' is due on ' . Carbon::today()->addDays(3)->toDateString() . '.',
            'read_at' => null,
        ]);
        Notification::create([
            'user_id' => $customer->id,
            'type' => 'seat_change',
            'title' => 'Seat Change Request Submitted',
            'body' => 'Your request to move to A-102-Bed1 is pending admin approval.',
            'read_at' => null,
        ]);
        Notification::create([
            'user_id' => $customer->id,
            'type' => 'announcement',
            'title' => 'Welcome to Hostel Management',
            'body' => 'Welcome! Manage your seat, rent, leave and exit requests from your dashboard.',
            'read_at' => Carbon::now(),
        ]);

        // ---------- Announcements ----------
        Announcement::create([
            'title' => 'Water Maintenance Notice',
            'body' => 'Water supply will be unavailable on Saturday from 9 AM to 12 PM due to maintenance.',
            'audience' => 'all',
            'published_at' => Carbon::now(),
        ]);
        Announcement::create([
            'title' => 'New Cafeteria Menu',
            'body' => 'Our cafeteria has a new weekly menu. Check the notice board.',
            'audience' => 'customers',
            'published_at' => Carbon::now(),
        ]);
    }
}
