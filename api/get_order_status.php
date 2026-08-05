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

$order_id = $_GET['id'] ?? null;

if (!$order_id) {
    http_response_code(400);
    echo json_encode(["error" => "Не указан ID заказа"]);
    exit;
}

try {
    // Получаем данные заказа, клиента и водителя (если он назначен)
    $stmt = $pdo->prepare("
        SELECT 
            o.id, o.status, o.from_address, o.to_address, o.from_sector, o.to_sector, 
            o.distance_km, o.offered_price, o.commission_payer, o.driver_id,
            c.name as client_name, c.phone as client_phone,
            d.name as driver_name, d.phone as driver_phone, d.car_make, d.car_number, d.car_year
        FROM orders o 
        LEFT JOIN clients c ON o.client_id = c.id 
        LEFT JOIN drivers d ON o.driver_id = d.id
        WHERE o.id = ?
    ");
    $stmt->execute([$order_id]);
    $order = $stmt->fetch();

    if (!$order) {
        http_response_code(404);
        echo json_encode(["error" => "Заказ не найден"]);
        exit;
    }

    // Формируем чистый ответ с нужными полями
    echo json_encode([
        "success" => true,
        "order" => [
            "id" => $order['id'],
            "status" => $order['status'],
            "from_address" => $order['from_address'],
            "to_address" => $order['to_address'],
            "from_sector" => $order['from_sector'],
            "to_sector" => $order['to_sector'],
            "distance_km" => $order['distance_km'],
            "offered_price" => $order['offered_price'],
            "commission_payer" => $order['commission_payer'],
            "client_phone" => $order['client_phone'],
            // Данные водителя (будут null, если статус еще 'searching')
            "driver_name" => $order['driver_name'],
            "driver_phone" => $order['driver_phone'],
            "car_make" => $order['car_make'],
            "car_number" => $order['car_number'],
            "car_year" => $order['car_year']
        ]
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>