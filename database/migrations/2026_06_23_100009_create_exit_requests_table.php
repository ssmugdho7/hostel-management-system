<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('requested_exit_date');
            $table->unsignedInteger('notice_period_days');
            $table->boolean('notice_valid')->default(false);
            $table->text('reason')->nullable();
            $table->decimal('rent_payable', 10, 2)->default(0);
            $table->decimal('deposit_refundable', 10, 2)->default(0);
            $table->decimal('net_payable', 10, 2)->default(0); // positive=user pays, negative=user receives
            $table->string('status')->default('pending'); // pending|approved|rejected
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exit_requests');
    }
};
