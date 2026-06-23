<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seat_change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_seat_id')->constrained('seats')->cascadeOnDelete();
            $table->foreignId('to_seat_id')->constrained('seats')->cascadeOnDelete();
            $table->string('type'); // same_branch|different_branch
            $table->date('requested_date');
            $table->decimal('balance_before', 10, 2)->default(0);
            $table->decimal('payable_amount', 10, 2)->default(0);
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seat_change_requests');
    }
};
