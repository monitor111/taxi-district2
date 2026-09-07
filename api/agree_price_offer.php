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
    echo json_encode(["error" => "Помилка підключення до БД"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$offer_id = $data['offer_id'] ?? null;
$order_id_direct = $data['order_id'] ?? null;
$amount_direct = $data['amount'] ?? null;

try {
    $pdo->beginTransaction();

    // СЦЕНАРИЙ 1: Клиент соглашается на конкретное предложение водителя
    if ($offer_id) {
        // Блокируем строку предложения, чтобы никто другой не обработал её одновременно
        $stmt = $pdo->prepare("SELECT order_id, offer_amount FROM price_offers WHERE id = ? AND status = 'pending' FOR UPDATE");
        $stmt->execute([$offer_id]);
        $offer = $stmt->fetch();

        if (!$offer) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => "Пропозицію не знайдено або вона вже оброблена"]);
            exit;
        }

        $order_id = $offer['order_id'];
        $amount_to_add = $offer['offer_amount'];

        // Обновляем цену заказа ТОЛЬКО если он все еще в поиске
        $stmt = $pdo->prepare("UPDATE orders SET offered_price = offered_price + ? WHERE id = ? AND status = 'searching'");
        $stmt->execute([$amount_to_add, $order_id]);

        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => "Замовлення вже не активне або не знайдено"]);
            exit;
        }

        // Помечаем предложение как принятое
        $stmt = $pdo->prepare("UPDATE price_offers SET status = 'accepted' WHERE id = ?");
        $stmt->execute([$offer_id]);
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Ціну успішно оновлено"]);
    } 
    // СЦЕНАРИЙ 2: Клиент поднимает цену сам (без предложения водителя)
    else if ($order_id_direct && $amount_direct && $amount_direct > 0) {
        $stmt = $pdo->prepare("UPDATE orders SET offered_price = offered_price + ? WHERE id = ? AND status = 'searching'");
        $stmt->execute([$amount_direct, $order_id_direct]);

        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "error" => "Замовлення вже не активне або не знайдено"]);
            exit;
        }

        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Ціну успішно оновлено"]);
    } 
    else {
        $pdo->rollBack();
        echo json_encode(["success" => false, "error" => "Некоректні дані для оновлення ціни"]);
    }

} catch (\PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Помилка БД: " . $e->getMessage()]);
}
?>