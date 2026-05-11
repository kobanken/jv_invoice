<?php
declare(strict_types=1);

function calculate_amount(int $unitPrice, int $quantity): int
{
    return $unitPrice * $quantity;
}

function tax_rate(): float
{
    return (float) env_value('TAX_RATE', '0.10');
}

function calculate_tax(int $subtotal): int
{
    return (int) round($subtotal * tax_rate());
}
