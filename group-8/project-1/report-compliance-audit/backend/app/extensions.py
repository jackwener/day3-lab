# -*- coding: utf-8 -*-
"""Flask扩展初始化"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()
