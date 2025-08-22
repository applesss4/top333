import os
import requests
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 获取环境变量
api_token = os.getenv('VIKA_API_TOKEN')
datasheet_id = os.getenv('VIKA_DATASHEET_ID')

if not api_token or not datasheet_id:
    print('错误: 缺少必要的环境变量')
    print(f'VIKA_API_TOKEN: {"已设置" if api_token else "未设置"}')
    print(f'VIKA_DATASHEET_ID: {"已设置" if datasheet_id else "未设置"}')
    exit(1)

print(f'API Token: {api_token[:10]}...')
print(f'Datasheet ID: {datasheet_id}')

# 请求头
headers = {
    'Authorization': f'Bearer {api_token}',
    'Content-Type': 'application/json'
}

# 获取用户数据
url = f'https://vika.cn/fusion/v1/datasheets/{datasheet_id}/records?fieldKey=name'

try:
    response = requests.get(url, headers=headers)
    print(f'\n响应状态码: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        print(f'\n用户数据:')
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        if 'data' in data and 'records' in data['data']:
            records = data['data']['records']
            print(f'\n找到 {len(records)} 个用户记录:')
            for i, record in enumerate(records):
                fields = record.get('fields', {})
                username = fields.get('username', '未知')
                email = fields.get('email', '未知')
                print(f'{i+1}. 用户名: {username}, 邮箱: {email}')
    else:
        print(f'请求失败: {response.text}')
        
except Exception as e:
    print(f'请求异常: {e}')