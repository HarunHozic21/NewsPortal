import sys
import os

path = '/home/hara'
if path not in sys.path:
    sys.path.append(path)

from dotenv import load_dotenv
load_dotenv(os.path.join(path, '.env'))

from app import create_app
application = create_app('production')