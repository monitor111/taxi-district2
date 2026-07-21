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
    echo json_encode(["error" => "Ошибка подключения к БД: " . $e->getMessage()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['phone']) || !isset($data['from']) || !isset($data['to']) || !isset($data['price'])) {
    http_response_code(400);
    echo json_encode(["error" => "Недостаточно данных"]);
    exit;
}

$phone = trim($data['phone']);
$name = trim($data['name'] ?? 'Клиент');
$from = trim($data['from']);
$to = trim($data['to']);
$distance = floatval($data['distance'] ?? 0);
$price = floatval($data['price']);
$commission = $data['commission_payer'] ?? 'client';

// Получаем сектора (если их нет, будут пустые строки)
$from_sector = trim($data['from_sector'] ?? '');
$to_sector = trim($data['to_sector'] ?? '');

try {
    // 1. Проверяем или создаем клиента
    $stmt = $pdo->prepare("SELECT id FROM clients WHERE phone = ?");
    $stmt->execute([$phone]);
    $client = $stmt->fetch();

    if ($client) {
        $client_id = $client['id'];
        $pdo->prepare("UPDATE clients SET name = ? WHERE id = ?")->execute([$name, $client_id]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO clients (phone, name, trip_count) VALUES (?, ?, 1)");
        $stmt->execute([$phone, $name]);
        $client_id = $pdo->lastInsertId();
    }

    // 2. Создаем заказ (РОВНО 8 знаков вопроса и 8 переменных ниже)
    $stmt = $pdo->prepare("
        INSERT INTO orders (client_id, from_address, to_address, from_sector, to_sector, distance_km, offered_price, commission_payer, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'searching')
    ");
    
    $stmt->execute([
        $client_id,    // 1
        $from,         // 2
        $to,           // 3
        $from_sector,  // 4
        $to_sector,    // 5
        $distance,     // 6
        $price,        // 7
        $commission    // 8
    ]);
    
    $order_id = $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "order_id" => $order_id,
        "message" => "Заказ успешно создан"
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка БД: " . $e->getMessage()]);
}
?>