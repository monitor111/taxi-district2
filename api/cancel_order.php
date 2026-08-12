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
$client_phone = $data['client_phone'] ?? '';

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не указан ID заказа"]);
    exit;
}

try {
    // Проверяем, что заказ принадлежит этому клиенту и ещё не принят
    $stmt = $pdo->prepare("
        SELECT o.id, o.status, o.client_id, c.phone 
        FROM orders o 
        JOIN clients c ON o.client_id = c.id 
        WHERE o.id = ?
    ");
    $stmt->execute([$order_id]);
    $order = $stmt->fetch();

    if (!$order) {
        http_response_code(404);
        echo json_encode(["error" => "Заказ не найден"]);
        exit;
    }

    if ($order['phone'] !== $client_phone) {
        http_response_code(403);
        echo json_encode(["error" => "Нет доступа к этому заказу"]);
        exit;
    }

//     if ($order['phone'] !== $client_phone) {
//     http_response_code(403);
//     echo json_encode([
//         "error" => "Нет доступа к этому заказу",
//         "debug" => [
//             "phone_in_db" => $order['phone'],
//             "phone_from_client" => $client_phone,
//             "client_id_in_order" => $order['client_id']
//         ]
//     ]);
//     exit;
// }

    if ($order['status'] !== 'searching') {
        http_response_code(400);
        echo json_encode(["error" => "Заказ уже принят водителем и не может быть отменён"]);
        exit;
    }

    // Отменяем заказ
    $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'searching'");
    $stmt->execute([$order_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "message" => "Заказ успешно отменён"]);
    } else {
        echo json_encode(["success" => false, "error" => "Не удалось отменить заказ"]);
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>