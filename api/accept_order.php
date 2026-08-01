<?php
header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$db   = 'taxi-district2';
$user = 'root';
$pass = ''; 
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка подключения к БД"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$order_id = $data['order_id'] ?? null;

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не указан ID заказа"]);
    exit;
}

try {
    // Меняем статус заказа на 'accepted'
    // (Позже сюда можно добавить привязку driver_id, если будет система авторизации водителей)
    $stmt = $pdo->prepare("UPDATE orders SET status = 'accepted' WHERE id = ? AND status = 'searching'");
    $stmt->execute([$order_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "message" => "Заказ успешно принят"]);
    } else {
        echo json_encode(["success" => false, "error" => "Заказ уже не активен или не найден"]);
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>

