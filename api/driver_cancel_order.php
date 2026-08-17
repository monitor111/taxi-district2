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
$driver_phone = $data['driver_phone'] ?? '';

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не указан ID заказа"]);
    exit;
}

try {
    // Получаем данные водителя по телефону
    $stmt = $pdo->prepare("SELECT id FROM drivers WHERE phone = ?");
    $stmt->execute([$driver_phone]);
    $driver = $stmt->fetch();

    if (!$driver) {
        http_response_code(404);
        echo json_encode(["error" => "Водитель не найден"]);
        exit;
    }

    $driver_id = $driver['id'];

    // Проверяем, что заказ принят именно этим водителем
    $stmt = $pdo->prepare("SELECT id, status, driver_id FROM orders WHERE id = ?");
    $stmt->execute([$order_id]);
    $order = $stmt->fetch();

    if (!$order) {
        http_response_code(404);
        echo json_encode(["error" => "Заказ не найден"]);
        exit;
    }

    if ($order['status'] !== 'accepted') {
        http_response_code(400);
        echo json_encode(["error" => "Заказ не активен или уже отменён"]);
        exit;
    }

    if ($order['driver_id'] != $driver_id) {
        http_response_code(403);
        echo json_encode(["error" => "Этот заказ вам не принадлежит"]);
        exit;
    }

    // Возвращаем заказ в статус "searching" и убираем водителя
    $stmt = $pdo->prepare("UPDATE orders SET status = 'searching', driver_id = NULL, accepted_at = NULL WHERE id = ? AND status = 'accepted'");
    $stmt->execute([$order_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "message" => "Заказ возвращён в список свободных"]);
    } else {
        echo json_encode(["success" => false, "error" => "Не удалось отменить заказ"]);
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>