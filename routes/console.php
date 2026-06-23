<?php

use App\Models\Allocation;
use App\Models\Notification;
use App\Models\RentBill;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('Hostel Management System is running!');
})->purpose('Display an inspiring quote');

Artisan::command('hostel:generate-rent-bills', function () {
    $this->info('Generating rent bills for active customers...');

    $month = Carbon::today()->format('Y-m');
    $activeCustomers = User::where('role', 'customer')->where('status', 'active')->get();

    foreach ($activeCustomers as $user) {
        $active = $user->allocations()->where('status', 'active')->first();
        if (!$active) {
            continue;
        }

        $existingBill = $user->rentBills()->where('period_month', $month)->first();
        if ($existingBill) {
            continue;
        }

        $daysInMonth = Carbon::today()->daysInMonth;
        $amountDue = round($daysInMonth * (float) $active->price_per_day, 2);

        RentBill::create([
            'user_id' => $user->id,
            'period_month' => $month,
            'amount_due' => $amountDue,
            'amount_paid' => 0,
            'due_date' => Carbon::today()->endOfMonth()->toDateString(),
            'status' => 'due',
        ]);

        $this->line("Created bill for {$user->name}: {$amountDue} BDT");
    }

    $this->info('Rent bills generated.');
})->purpose('Generate monthly rent bills for active customers');

Artisan::command('hostel:send-rent-reminders', function () {
    $this->info('Sending rent reminders...');

    $reminderDays = 3;
    $targetDate = Carbon::today()->addDays($reminderDays)->toDateString();

    $dueBills = RentBill::where('status', '!=', 'paid')
        ->where('due_date', '<=', $targetDate)
        ->with('user')
        ->get();

    foreach ($dueBills as $bill) {
        Notification::create([
            'user_id' => $bill->user_id,
            'type' => 'rent_reminder',
            'title' => 'Rent Due Soon',
            'body' => "Your rent of {$bill->amount_due} BDT for {$bill->period_month} is due on {$bill->due_date}. Please pay on time.",
        ]);
        $this->line("Reminder sent to {$bill->user->name}");
    }

    $this->info("Sent {$dueBills->count()} reminders.");
})->purpose('Send rent reminders to customers with upcoming due dates');

Artisan::command('hostel:process-daily-charges', function () {
    $this->info('Processing daily rent charges...');

    $activeAllocations = Allocation::where('status', 'active')->with('user')->get();

    foreach ($activeAllocations as $allocation) {
        $balance = $allocation->user->balance();
        $rate = (float) $allocation->price_per_day;

        if ($balance < $rate && $rate > 0) {
            Notification::create([
                'user_id' => $allocation->user_id,
                'type' => 'rent_reminder',
                'title' => 'Low Balance Warning',
                'body' => "Your balance ({$balance} BDT) is low. Daily charge is {$rate} BDT. Please add funds to avoid service interruption.",
            ]);
        }
    }

    $this->info('Daily charges processed.');
})->purpose('Check low balance and notify customers');

// Schedule the commands
use Illuminate\Support\Facades\Schedule;

Schedule::command('hostel:generate-rent-bills')->monthlyOn(1, '00:05');
Schedule::command('hostel:send-rent-reminders')->dailyAt('08:00');
Schedule::command('hostel:process-daily-charges')->dailyAt('00:10');
