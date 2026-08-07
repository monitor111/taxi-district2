<?php
header("Content-Type: application/json; charset=UTF-8");

// Настройки подключения (такие же, как в create_order.php)
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

try {
    // Получаем только активные заказы, которые ищут водителя
        $stmt = $pdo->query("
    SELECT id, from_address, from_lat, from_lon, to_address, to_lat, to_lon, from_sector, to_sector, distance_km, offered_price, created_at 
    FROM orders 
    WHERE status = 'searching' 
    ORDER BY created_at DESC
");
    
    $orders = $stmt->fetchAll();

    // Отдаем массив заказов в формате JSON
    echo json_encode($orders);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка получения заказов"]);
}
?>