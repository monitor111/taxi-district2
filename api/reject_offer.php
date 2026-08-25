<?php
header("Content-Type: application/json; charset=UTF-8");

$pdo = new PDO(
    "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
    "root",
    ""
);

$data = json_decode(file_get_contents('php://input'), true);
$offer_id = $data['offer_id'] ?? null;

if (!$offer_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не вказаний ID пропозиції"]);
    exit;
}

try {
    // Помечаем предложение как отклонённое
    $stmt = $pdo->prepare("UPDATE price_offers SET status = 'rejected' WHERE id = ? AND status = 'pending'");
    $stmt->execute([$offer_id]);

    if ($stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(["error" => "Пропозиція не знайдена або вже оброблена"]);
        exit;
    }

    echo json_encode(["success" => true, "message" => "Пропозиція відхилена"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Помилка БД: " . $e->getMessage()]);
}
?>