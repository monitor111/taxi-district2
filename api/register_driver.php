<?php
header("Content-Type: application/json; charset=UTF-8");

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
];

try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=taxi-district2;charset=utf8mb4",
        "root",
        "",
        $options
    );
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => "Ошибка подключения: " . $e->getMessage()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$phone = $data['phone'] ?? '';

if (!$phone) {
    echo json_encode(["success" => false, "error" => "Телефон обов'язковий"]);
    exit;
}

// Превращаем пустые строки в NULL для безопасной записи в БД
$name = !empty($data['name']) ? $data['name'] : null;
$car_make = !empty($data['car_make']) ? $data['car_make'] : null;
$car_number = !empty($data['car_number']) ? $data['car_number'] : null;
$car_year = !empty($data['car_year']) ? (int)$data['car_year'] : null;

try {
    // Проверяем, есть ли уже водитель с таким телефоном
    $stmt = $pdo->prepare("SELECT id FROM drivers WHERE phone = ?");
    $stmt->execute([$phone]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Обновляем запись. COALESCE означает: "если новое значение NULL, оставь старое"
        // Это идеально для многоэтапной регистрации!
        $stmt = $pdo->prepare("
            UPDATE drivers 
            SET name = COALESCE(?, name), 
                car_make = COALESCE(?, car_make), 
                car_number = COALESCE(?, car_number), 
                car_year = COALESCE(?, car_year) 
            WHERE phone = ?
        ");
        $stmt->execute([$name, $car_make, $car_number, $car_year, $phone]);
    } else {
        // Создаём новую запись (для нового водителя имя обязательно)
        if (!$name) {
            echo json_encode(["success" => false, "error" => "Ім'я обов'язкове для нового водія"]);
            exit;
        }
        
        $stmt = $pdo->prepare("INSERT INTO drivers (phone, name, car_make, car_number, car_year) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$phone, $name, $car_make, $car_number, $car_year]);
    }

    echo json_encode(["success" => true]);

} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => "Помилка БД: " . $e->getMessage()]);
}
?>