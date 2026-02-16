
import json
import os
import uuid
from datetime import datetime, timezone

DB_FILE = "local_db.json"

new_qa = [
    # Категория: Профиль
    {
        "id": str(uuid.uuid4()),
        "category": "profile",
        "question": "Как изменить аватар?",
        "answer": "Нажмите на круглую иконку с камерой или плюсом в верхней части редактора, чтобы загрузить новое фото профиля.",
        "keywords": ["аватар", "фото", "профиль", "сменить"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "profile",
        "question": "Как сменить фон или обложку?",
        "answer": "Нажмите на верхнюю область (баннер) в редакторе. Вы сможете загрузить любое изображение в качестве фона вашей страницы.",
        "keywords": ["фон", "обложка", "баннер", "картинка"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "profile",
        "question": "Как получить галочку верификации?",
        "answer": "Статус верифицированного профиля или бренда можно получить в настройках вашего Dashboard (главная панель управления).",
        "keywords": ["галочка", "верификация", "подтвердить", "статус"]
    },
    
    # Категория: Блоки
    {
        "id": str(uuid.uuid4()),
        "category": "blocks",
        "question": "Какие типы блоков доступны?",
        "answer": "Вам доступно более 20 типов контента: Текст, Музыка, FAQ, Галерея, Соцсети, YouTube, Spotify, Витрина, Донаты и многие другие.",
        "keywords": ["блоки", "типы", "контент", "что можно добавить"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "blocks",
        "question": "Как добавить музыку?",
        "answer": "Выберите блок 'Музыка' и вставьте ссылку на платформу или UPC/ISRC код. Доступно 6 стильных пресетов оформления.",
        "keywords": ["музыка", "плеер", "трек", "песня", "apple", "spotify"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "blocks",
        "question": "Как создать свой магазин (Витрину)?",
        "answer": "Используйте блок 'Витрина'. Вы сможете выставить товары с ценами, а заявки от покупателей будут приходить прямо в ваш Dashboard.",
        "keywords": ["магазин", "витрина", "продать", "товар", "деньги"]
    },

    # Категория: Сортировка
    {
        "id": str(uuid.uuid4()),
        "category": "sort",
        "question": "Как менять блоки местами?",
        "answer": "Зажмите иконку 'шести точек' слева от названия блока и просто перетащите его вверх или вниз. Также можно использовать стрелки в меню блока.",
        "keywords": ["порядок", "двигать", "сортировка", "переместить", "местами"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "sort",
        "question": "Нужно ли нажимать кнопку Сохранить?",
        "answer": "Основные изменения (текст профиля, порядок блоков) сохраняются АВТОМАТИЧЕСКИ. Кнопка 'Сохранить' нужна только внутри настроек конкретных блоков.",
        "keywords": ["сохранить", "автосохранение", "публикация"]
    },
    {
        "id": str(uuid.uuid4()),
        "category": "sort",
        "question": "Как увидеть свою страницу в интернете?",
        "answer": "Нажмите кнопку 'Перейти' в правом верхнем углу редактора. Ваша страница откроется в новой вкладке именно так, как её видят посетители.",
        "keywords": ["посмотреть", "сайт", "ссылка", "просмотр", "публикация"]
    }
]

def seed():
    if not os.path.exists(DB_FILE):
        print("DB file not found")
        return

    with open(DB_FILE, 'r', encoding='utf-8') as f:
        db_data = json.load(f)

    if "my_local_db" not in db_data:
        db_data["my_local_db"] = {}
    
    # Replace existing support_qa with fresh seeded data for demo/MVP
    db_data["my_local_db"]["support_qa"] = new_qa
    
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db_data, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully seeded {len(new_qa)} Q&A items into support_qa.")

if __name__ == "__main__":
    seed()
