<?php
header("Content-Type: application/json; charset=UTF-8");

$pdo = new PDO(
    "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
    "root",
    ""
);

$data = json_decode(file_get_contents('php://input'), true);
$order_id = $data['order_id'] ?? null;
$driver_phone = $data['driver_phone'] ?? '';
$offer_amount = $data['offer_amount'] ?? null;

if (!$order_id || !$offer_amount) {
    http_response_code(400);
    echo json_encode(["error" => "Не вказані всі дані"]);
    exit;
}

try {
    // Находим водителя по телефону
    $stmt = $pdo->prepare("SELECT id FROM drivers WHERE phone = ?");
    $stmt->execute([$driver_phone]);
    $driver = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$driver) {
        http_response_code(404);
        echo json_encode(["error" => "Водій не знайдений"]);
        exit;
    }

    $driver_id = $driver['id'];

    // Проверяем, что заказ существует и в статусе searching
    $stmt = $pdo->prepare("SELECT id, status, offered_price FROM orders WHERE id = ?");
    $stmt->execute([$order_id]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode(["error" => "Замовлення не знайдено"]);
        exit;
    }

    if ($order['status'] !== 'searching') {
        http_response_code(400);
        echo json_encode(["error" => "Замовлення вже прийнято або скасовано"]);
        exit;
    }

    // Проверяем, что этот водитель ещё не делал предложение
    $stmt = $pdo->prepare("SELECT id FROM price_offers WHERE order_id = ? AND driver_id = ? AND status = 'pending'");
    $stmt->execute([$order_id, $driver_id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        http_response_code(400);
        echo json_encode(["error" => "Ви вже зробили пропозицію по цьому замовленню"]);
        exit;
    }

    // Создаём новое предложение
    $stmt = $pdo->prepare("INSERT INTO price_offers (order_id, driver_id, offer_amount, status) VALUES (?, ?, ?, 'pending')");
    $stmt->execute([$order_id, $driver_id, $offer_amount]);

    echo json_encode(["success" => true, "message" => "Пропозиція відправлена"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Помилка БД: " . $e->getMessage()]);
}
?>