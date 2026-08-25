<?php
header("Content-Type: application/json; charset=UTF-8");

$pdo = new PDO(
    "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
    "root",
    ""
);

$order_id = $_GET['id'] ?? null;

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не вказаний ID замовлення"]);
    exit;
}

try {
    // Получаем все активные предложения для этого заказа (только pending)
    $stmt = $pdo->prepare("
        SELECT 
            po.id, 
            po.offer_amount, 
            po.created_at,
            d.name as driver_name
        FROM price_offers po
        LEFT JOIN drivers d ON d.id = po.driver_id
        WHERE po.order_id = ? AND po.status = 'pending'
        ORDER BY po.created_at ASC
    ");
    $stmt->execute([$order_id]);
    $offers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "offers" => $offers
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Помилка БД: " . $e->getMessage()]);
}
?>