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

        // Проверяем, можно ли отменить заказ
    if ($order['status'] === 'searching') {
        // Заказ ещё не принят — отменяем свободно
        $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'searching'");
        $stmt->execute([$order_id]);
        
        echo json_encode(["success" => true, "message" => "Заказ успешно отменён"]);
        
    } else if ($order['status'] === 'accepted') {
        // Заказ принят водителем — проверяем время
        $stmt = $pdo->prepare("SELECT accepted_at FROM orders WHERE id = ?");
        $stmt->execute([$order_id]);
        $order_data = $stmt->fetch();
        
        $accepted_at = strtotime($order_data['accepted_at']);
        $now = time();
        $minutes_passed = ($now - $accepted_at) / 60;
        
        // ====== ЭТО СТРОКА С ВРЕМЕНЕМ (для тестирования поменяйте 7 на 1) ======
        if ($minutes_passed > 1) {
            // Прошло больше 7 минут — увеличиваем счётчик поздних отказов
            $stmt = $pdo->prepare("UPDATE clients SET late_cancel_count = late_cancel_count + 1 WHERE id = ?");
            $stmt->execute([$order['client_id']]);
            
            // Отменяем заказ
            $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'accepted'");
            $stmt->execute([$order_id]);
            
            echo json_encode([
                "success" => true, 
                "message" => "Заказ отменён. У вас теперь " . ($minutes_passed > 7 ? "поздний отказ" : "")
            ]);
            
        } else {
            // Прошло меньше 7 минут — отменяем свободно
            $stmt = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'accepted'");
            $stmt->execute([$order_id]);
            
            echo json_encode(["success" => true, "message" => "Заказ успешно отменён"]);
        }
        
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Заказ уже завершён или отменён"]);
        exit;
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>