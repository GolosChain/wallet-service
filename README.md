# Документация для работы с сервисом cyberway.golos_wallet

## Пояснения

Golos_wallet -- сервис, который предоставляет удобный API для взаимодействия с котрактом cyber.token, а именно получать информацию по токенам, трансферам и балансам пользователей cyber.token.

Изначально кошелёк создавался как сервис для биржы Bittrex, который должен был 1 в 1 имитировать cli_wallet. cli_wallet -- консольная утилита для цепочки golos, имеющая возможность взаимодействия с ней через json-rpc интерфейс. Для этого нужно было прописать ключ -r и передать endpoint (пр. 127.0.0.1:2001).

Поэтому у кошелька по сути есть два подмножества методов: унаследованные от cli_wallet и новые, которые упрощаяют работу с cyber.token. Соответственно основное их внешнее различие в нотации:
первые -- `underscore_notation`, вторые -- `smallCamleCase`.

#### Описание механики поддержки актуального состояния балансов пользователей в базе кошелька

**TODO**

#### Формат запросов и ответов

Общение происходит по протоколу [JSON-RPC 2.0](https://www.jsonrpc.org/specification) с некоторыми более строгими
правилами:

-   Параметры запроса должны только быть именованными, в виде JSON-объекта, безымянные не поддерживаются.
-   Результат запроса в поле `result` всегда содержит JSON объект с результатом выполнения.
-   В случае ошибки в поле `error` всегда содержится ответ формата `{"code": 123, "message": "Description text"}`,
    где `code` это цифровой код ошибки, описывающий тип проишествия, а `description` - текстовую ремарку для понимания
    ошибки человеком.
-   RPC-нотификации работают как указано в стандарте, запросы без поля `id` не получают ответа, но сервер может
    их обработать по своему усмотрению.

Дополнительно стоит учитывать что сервер сам может передавать данные на клиент без получения запроса - например
так работает рассылка о событиях для пользователя, данные поступают через WebSocket со стороны сервера и
являются RPC-нотификациями, что не требует от клиента возвращать серверу какой-либо ответ.

## Что использует сервис

-   MongoDB -- база для хранения информации по cyber.token
-   Nats -- очередь, к которой можно подключиться для получения рассылки эвентов от EventEngine.

## Запуск сервиса

#### docker-compose

Для запуска сервиса достаточно вызвать команду `docker-compose up --build` в корне проекта, предварительно указав
необходимые `ENV` переменные.
Это запустит два контейнера: `wallet-mongo` и `wallet-node`.

## Инициализационные параметры

Для запуска сервиса необходимо в корень проекта положить `.env` файл. За основу можно взять `.env.example`.

Основные переменные окружения `ENV`:

-   `GLS_CONNECTOR_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение при запуске без докера - `127.0.0.1`

-   `GLS_CONNECTOR_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение при запуске без докера - `3000`

-   `GLS_METRICS_HOST` - адрес хоста для метрик StatsD.  
    Дефолтное значение при запуске без докера - `127.0.0.1`

-   `GLS_METRICS_PORT` - адрес порта для метрик StatsD.  
    Дефолтное значение при запуске без докера - `8125`

-   `GLS_BLOCKCHAIN_BROADCASTER_CONNECT` _(обязательно)_ - адрес nats для получения эвентов от EventEngine подключенного к ноде cyberway

-   `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

## API

### getBalance

**Запрос :arrow_right:**

| Процедура  | Авторизация  | Описание                        |
| :--------: | :----------: | ------------------------------- |
| getBalance | Не требуется | Получить баллансы пользователей |

|  Параметр  |  Тип   | Обяз. | Описание                          |
| :--------: | :----: | :---: | --------------------------------- |
|   userId   | string |  Да   | Имя пользователя                  |
| currencies | [string] |  нет  | Массив `sym` интересующих токенов. Указать `["all"]`, если нужны все |
| type | string |  нет  | Тип токена: `liquid`, `vesting` или оба: `all` |

**Пример :one::**

Получаем баланс по всем токенам для пользователя `destroyer`

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "getBalance",
    "params": {
        "userId": "destroyer"
    }
}
```

**:arrow_left: Ответ**

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "userId": "destroyer",
        "vesting": {
            "total": {
                "GESTS": "2228760.240739 GOLOS",
                "GOLOS": "2137.371"
            },
            "outDelegate": {
                "GESTS": "0.000000 GOLOS",
                "GOLOS": "0"
            },
            "inDelegated": {
                "GESTS": "0.000000 GOLOS",
                "GOLOS": "0"
            }
        },
        "liquid": {
            "GOLOS": "11.444"
        }
    }
}
```

**Пример :two::**

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "getBalance",
    "params": {
        "userId": "cyber.token",
        "currencies": ["ABCXXXX", "ABXXXXX"],
        "type": "liquid"
    }
}
```

**:arrow_left: Ответ**

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": {
        "userId": "cyber.token",
        "liquid": {
            "ABCXXXX": "10.000",
            "ABXXXXX": "11.000"
         }
    }
}
```

---

### getHistory

**Запрос :arrow_right:**

| Процедура  | Авторизация  | Описание                                  |
| :--------: | :----------: | ----------------------------------------- |
| getHistory | Не требуется | Получить историю трансферов пользователей |

|  Параметр   |        Тип         | Обяз. | Описание                                                                                                                                                                             |
| :---------: | :----------------: | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   sender    |      `string`      |  Нет  | Имя отправителя трансфера                                                                                                                                                            |
|  receiver   |      `string`      |  Нет  | Имя получателя трансфера                                                                                                                                                             |
| sequenceKey | `null` or `string` |  Да   | Отступ от начала списка. Если передана строка с валидным sequenceKey, то будет возвращено не более `limit` элементов начиная со следующего за элементом с `_id` равным `sequenceKey` |
|    limit    |      `number`      |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1`                 |

#### Необходимо указать отправителя и получателя. Для работы необходим хотя бы один из них.

Пример:

Получаем все транзакции с отправителем `cyber.token` и получателем `korpusenko`

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getHistory",
    "params": {
        "sender": "tst2kpdqxjla",
        "sequenceKey": null,
        "limit": 100
    }
}
```

**:arrow_left: Ответ**

Если трансферы соответствующие запросу существуют, то будет возващён массив объектов `TransferModel`, иначе пустой массив.

```json
{
    "jsonrpc": "2.0",
    "id": 131542,
    "result": {
        "items": [
            {
                "id": "5d069a3e2b07cc09f1556d94",
                "sender": "tst2kpdqxjla",
                "receiver": "tst3ekvfbcra",
                "quantity": "0.001 GOLOS",
                "trx_id": "3e43c4411e1ef5638c5b477ec52b4a11de582218e491f0d9ef4f0b878455b3d6",
                "memo": "{ \"i\": 2, \"msg\": \"Hello, hirthe-freddy-md!\"}",
                "block": 148764,
                "timestamp": "2019-06-16T19:36:24.000Z"
            },
            {
                "id": "5d069a322b07cc86f0556d8f",
                "sender": "tst2kpdqxjla",
                "receiver": "tst3ekvfbcra",
                "quantity": "0.001 GOLOS",
                "trx_id": "f755e438a86e6446eefbd561caefa1caaa48b4bf99fff7c64d27dabf5ca14067",
                "memo": "{ \"i\": 1, \"msg\": \"Hello, hirthe-freddy-md!\"}",
                "block": 148760,
                "timestamp": "2019-06-16T19:36:12.000Z"
            },
            {
                "id": "5d069a2c2b07cc2320556d8c",
                "sender": "tst2kpdqxjla",
                "receiver": "tst3ekvfbcra",
                "quantity": "0.001 GOLOS",
                "trx_id": "83421002c5c3ee23b033f230cdcb15c38e40184c9af15cb9b52fa4fa5ebdf9f7",
                "memo": "{ \"i\": 0, \"msg\": \"Hello, hirthe-freddy-md!\"}",
                "block": 148758,
                "timestamp": "2019-06-16T19:36:06.000Z"
            },
            {
                "id": "5d069a202b07cc5eff556d7b",
                "sender": "tst2kpdqxjla",
                "receiver": "gls.vesting",
                "quantity": "5.000 GOLOS",
                "trx_id": "e88133e5fa686fd2451ada06fa50ee8a549ff3882eb21598b7cec762489b60d1",
                "memo": "tst2kpdqxjla",
                "block": 148754,
                "timestamp": "2019-06-16T19:35:54.000Z"
            },
            {
                "id": "5d069a202b07cc4c88556d73",
                "sender": "tst2kpdqxjla",
                "receiver": "gls.vesting",
                "quantity": "1.000 GOLOS",
                "trx_id": "f481be42e6c227667f6d96d9acbe18f68dd05fd5ce063d05b4fa9355de3c8267",
                "memo": "",
                "block": 148754,
                "timestamp": "2019-06-16T19:35:54.000Z"
            }
        ],
        "sequenceKey": null
    }
}
```

**:x: Ошибки**

| error code |     message     | Описание                        |
| :--------: | :-------------: | ------------------------------- |
|    805     | Wrong arguments | Переданы некорректные параметры |

---

### getTokensInfo

**Запрос :arrow_right:**

|   Процедура   | Авторизация  | Описание                                            |
| :-----------: | :----------: | --------------------------------------------------- |
| getTokensInfo | Не требуется | Получить информацию по токенам хранящимся в системе |

| Параметр |   Тип    | Обяз. | Описание                                |
| :------: | :------: | :---: | --------------------------------------- |
|  tokens  | string[] |  Да   | Массив строк `sym` интересующих токенов |

Пример:

Получим информацию по некоторым токенам:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTokensInfo",
    "params": {
        "tokens": ["REACT", "NEST", "ANGULAR", "CXX"]
    }
}
```

**:arrow_left: Ответ**

Будет возвращён массив с информацией по запрашиваемым токенам, которые были найдены в базе. Если на входе в массиве были токены, которых нет в базе, то для них будет отсутствовать запись в возвращаемом результате.

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": {
        "tokens": [
            {
                "issuer": "cyber.token",
                "max_supply": "10000000000.0000 REACT",
                "supply": "10000000000.0000 REACT",
                "sym": "REACT"
            },
            {
                "issuer": "cyber.token",
                "max_supply": "10000000000.0000 NEST",
                "supply": "10000000000.0000 NEST",
                "sym": "NEST"
            },
            {
                "issuer": "cyber.token",
                "max_supply": "10000000000.0000 ANGULAR",
                "supply": "10000000000.0000 ANGULAR",
                "sym": "ANGULAR"
            },
            {
                "issuer": "cyber.token",
                "max_supply": "10000000000.0000 CXX",
                "supply": "10000000000.0000 CXX",
                "sym": "CXX"
            }
        ]
    }
}
```

**:x: Ошибки**

| error code |     message     | Описание                      |
| :--------: | :-------------: | ----------------------------- |
|    805     | Wrong arguments | Передан некорректный аргумент |

---

### filter_account_history

**Запрос :arrow_right:**

|       Процедура        | Авторизация  | Описание                                                                                                      |
| :--------------------: | :----------: | ------------------------------------------------------------------------------------------------------------- |
| filter_account_history | Не требуется | Получить историю трансферов пользователя. Отличается от `getHistory` настройкой фильтров (как в `cli_wallet`) |

| Параметр |  Тип   | Обяз. | Описание                                                                                                                                                             |
| :------: | :----: | :---: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| account  | string |  Да   | Имя пользователя                                                                                                                                                     |
|   from   | number |  Да   | Размер отступа от начала списка трансферов в базе. Значение `-1` указывает на конец списка                                                                           |
|  limit   | number |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1` |
|  query   | object |  Да   | Фильтр для запросов. Обязательно должен быть указан хотя бы один параметр                                                                                            |

#### Параметры query

|      Параметр      |  Тип   | Обяз. | Описание                                                              |
| :----------------: | :----: | :---: | --------------------------------------------------------------------- |
|     select_ops     | object |  Нет  | **Не реализовано**                                                    |
|     filter_ops     | object |  Нет  | **Не реализовано**                                                    |
|     direction      | object |  Нет  | Указывает роль `account` в трансфере                                  |
|  direction.sender  | object |  Нет  | Фильтрует только те трансферы, где отправитель `account`              |
| direction.receiver | object |  Нет  | Фильтрует только те трансферы, где получатель `account`               |
|   direction.dual   | object |  Нет  | Фильтрует только те трансферы, где отправитель и получатель `account` |
|  direction === {}  | object |  Нет  | Позволяет получить все трансферы, где фигурирует `account`            |

Пример:

Получаем все транзакции с отправителем `cyber.token`

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "filter_account_history",
    "params": ["cyber.token", -1, 100, {}]
}
```

**Или**

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "filter_account_history",
    "params": {
        "account": "cyber.token",
        "from": -1,
        "limit": 100,
        "query": {}
    }
}
```

**:arrow_left: Ответ**

Если трансферы соответствующие запросу существуют, то будет возващён массив объектов `TransferModel`, иначе пустой массив.

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": [
        [
            0,
            {
                "block": 905226,
                "op": [
                    "transfer",
                    {
                        "amount": "1.0000 GLS",
                        "from": "cyber.token",
                        "memo": "{}",
                        "to": "korpusenko"
                    }
                ],
                "timestamp": "2019-04-01T18:34:27.000",
                "trx_id": "551fd2f848bc32ee256c2880b2186b5307908448f37ca7850e09ef46142f5b9b"
            }
        ],
        [
            1,
            {
                "block": 905227,
                "op": [
                    "transfer",
                    {
                        "amount": "2.0000 GLS",
                        "from": "cyber.token",
                        "memo": "{}",
                        "to": "korpusenko"
                    }
                ],
                "timestamp": "2019-04-01T18:34:30.000",
                "trx_id": "6619198ac252582755e641a743a1fe7663ec28b726180f21c50e1d4dd62af737"
            }
        ]
    ]
}
```

**:x: Ошибки**

| error code |     message     | Описание                        |
| :--------: | :-------------: | ------------------------------- |
|    805     | Wrong arguments | Переданы некорректные параметры |

---

## Vesting

### getVestingInfo

**Запрос :arrow_right:**

|   Процедура    | Авторизация  | Описание                             |
| :------------: | :----------: | ------------------------------------ |
| getVestingInfo | Не требуется | Получить общую информацию о вестинге |

| Параметр | Тип | Обяз. | Описание |
| :------: | :-: | :---: | -------- |
|   none   |     |       |          |

Пример:

Получим информацию о вестинге:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getVestingInfo",
    "params": {}
}
```

**:arrow_left: Ответ**

Общая информация о вестинге

```json
{
    "jsonrpc": "2.0",
    "id": 177339,
    "result": {
        "stat": "2450826336123.033597 GOLOS"
    }
}
```

**:x: Ошибки**

| error code | message | Описание |
| :--------: | :-----: | -------- |


---

### getVestingHistory

**Запрос :arrow_right:**

|     Процедура     | Авторизация  | Описание                                                                               |
| :---------------: | :----------: | -------------------------------------------------------------------------------------- |
| getVestingHistory | Не требуется | Получить историю изменения вестинга пользователя. Использует механику `from` - `limit` |

|  Параметр   |      Тип       | Обяз. | Описание                                                                                                                                                                             |
| :---------: | :------------: | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   account   |     string     |  Да   | Имя пользователя                                                                                                                                                                     |
| sequenceKey | null or string |  Да   | Отступ от начала списка. Если передана строка с валидным sequenceKey, то будет возвращено не более `limit` элементов начиная со следующего за элементом с `_id` равным `sequenceKey` |
|    limit    |     number     |  Да   | Количество записей из списка трансферов. В паре с `limit` формирует отрезок запроса: `[begin, from]` размером `limit`. Не может быть больше `from`, если `from > -1`                 |

Пример:

Получим историю изменений вестинга `testuser`:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getVestingHistory",
    "params": {
        "account": "testuser",
        "sequenceKey": null,
        "limit": 3
    }
}
```

**:arrow_left: Ответ**

История изменения вестинга для пользователя `testuser`

```json
{
    "jsonrpc": "2.0",
    "id": 183307,
    "result": {
        "items": [
            {
                "id": "5d069a7a2b07cc0a3f556db2",
                "who": "tst3ekvfbcra",
                "diff": {
                    "GESTS": "3.400499 GOLOS",
                    "GOLOS": "0.001 GOLOS"
                },
                "block": 148784,
                "trx_id": "a11067a743e4b184bc192064c4106846fa639cdf61ce5482be897db9d53dc719",
                "timestamp": "2019-06-16T19:37:24.000Z"
            },
            {
                "id": "5d069a742b07cc2881556dae",
                "who": "tst3ekvfbcra",
                "diff": {
                    "GESTS": "3.400499 GOLOS",
                    "GOLOS": "0.001 GOLOS"
                },
                "block": 148782,
                "trx_id": "caf54540d2e9126b1a7e29990778bf15df281c6c73eea7664d8f84cd4479bd02",
                "timestamp": "2019-06-16T19:37:18.000Z"
            },
            {
                "id": "5d069a202b07ccd84a556d7e",
                "who": "tst3ekvfbcra",
                "diff": {
                    "GESTS": "17002.498552 GOLOS",
                    "GOLOS": "5 GOLOS"
                },
                "block": 148754,
                "trx_id": "bdce9b1a94c04db62b18c1eef1b704d587635c0238e466c00c3beb2c5dbc4c2e",
                "timestamp": "2019-06-16T19:35:54.000Z"
            },
            {
                "id": "5d069a202b07cc35d7556d78",
                "who": "tst3ekvfbcra",
                "diff": {
                    "GESTS": "3400.499710 GOLOS",
                    "GOLOS": "1 GOLOS"
                },
                "block": 148754,
                "trx_id": "c05c10c25c7ca3f724c57ce6bd7db4bf2246f76fb0ee25b73765e2f1cfc7000d",
                "timestamp": "2019-06-16T19:35:54.000Z"
            }
        ],
        "sequenceKey": "5d069a202b07cc35d7556d78"
    }
}
```

**:x: Ошибки**

| error code |     message     | Описание                        |
| :--------: | :-------------: | ------------------------------- |
|    805     | Wrong arguments | Переданы некорректные параметры |

---

### convertTokensToVesting

**Запрос :arrow_right:**

| Процедура | Авторизация  | Описание                                                                                                                                        |
| :-------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|  convert  | Не требуется | Конвертировать `GOLOS` в `GESTS`. Расчитывается цена исходя из данных в wallet. С бч не взаимодействует => результат метода может быть неточным |

| Параметр |   Тип    | Обяз. | Описание                                                         |
| :------: | :------: | :---: | ---------------------------------------------------------------- |
|  tokens  | `string` |  Да   | Ассет в строковом предствлении для расчёта его стоимости в GESTS |

Пример:

Получим примерную стоимость `0.001 GOLOS` в `GESTS`.

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "convertTokensToVesting",
    "params": {
        "tokens": "0.001 GOLOS"
    }
}
```

**:arrow_left: Ответ**

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": "3.400493 GOLOS"
}
```

**:x: Ошибки**

| error code |        message         | Описание                                                           |
| :--------: | :--------------------: | ------------------------------------------------------------------ |
|    805     |    Wrong arguments     | Переданы некорректные параметры                                    |
|    811     | Data is absent in base | В базе отсутствуют нужные данные для успешного выполнения операции |

---

### convertVestingToToken

**Запрос :arrow_right:**

| Процедура | Авторизация  | Описание                                                                                                                                        |
| :-------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
|  convert  | Не требуется | Конвертировать `GESTS` в `GOLOS`. Расчитывается цена исходя из данных в wallet. С бч не взаимодействует => результат метода может быть неточным |

| Параметр |   Тип    | Обяз. | Описание                                                         |
| :------: | :------: | :---: | ---------------------------------------------------------------- |
| vesting  | `string` |  Да   | Ассет в строковом предствлении для расчёта его стоимости в GOLOS |

Пример:

Получим примерную стоимость `12345.000000 GESTS` в `GOLOS`.

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "convertVestingToToken",
    "params": {
        "vesting": "12345.000000 GOLOS"
    }
}
```

**:arrow_left: Ответ**

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "result": "3.63 GOLOS"
}
```

**:x: Ошибки**

| error code |        message         | Описание                                                           |
| :--------: | :--------------------: | ------------------------------------------------------------------ |
|    805     |    Wrong arguments     | Переданы некорректные параметры                                    |
|    811     | Data is absent in base | В базе отсутствуют нужные данные для успешного выполнения операции |

---
