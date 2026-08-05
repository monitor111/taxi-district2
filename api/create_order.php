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

// Получаем координаты (если пустые — сохраняем NULL)
$from_lat = !empty($data['from_lat']) ? floatval($data['from_lat']) : null;
$from_lon = !empty($data['from_lon']) ? floatval($data['from_lon']) : null;
$to_lat = !empty($data['to_lat']) ? floatval($data['to_lat']) : null;
$to_lon = !empty($data['to_lon']) ? floatval($data['to_lon']) : null;

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
    INSERT INTO orders (client_id, from_address, from_lat, from_lon, to_address, to_lat, to_lon, from_sector, to_sector, distance_km, offered_price, commission_payer, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'searching')
");

$stmt->execute([
    $client_id,    // 1
    $from,         // 2
    $from_lat,     // 3
    $from_lon,     // 4
    $to,           // 5
    $to_lat,       // 6
    $to_lon,       // 7
    $from_sector,  // 8
    $to_sector,    // 9
    $distance,     // 10
    $price,        // 11
    $commission    // 12
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