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
    $driver_phone = $data['driver_phone'] ?? '';
    $driver_id = null;

    // 1. Находим ID водителя по телефону
    if ($driver_phone) {
        $stmt = $pdo->prepare("SELECT id FROM drivers WHERE phone = ?");
        $stmt->execute([$driver_phone]);
        $driver = $stmt->fetch();
        if ($driver) {
            $driver_id = $driver['id'];
        }
    }

    // 2. Обновляем статус и привязываем водителя к заказу
    $stmt = $pdo->prepare("UPDATE orders SET status = 'accepted', driver_id = ?, accepted_at = NOW() WHERE id = ? AND status = 'searching'");
    $stmt->execute([$driver_id, $order_id]);

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

