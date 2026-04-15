"""
OCR服务模块（模拟）
提供图片中重量识别功能
"""
import random


def recognize_weight(image_file):
    """
    模拟识别图片中的重量
    
    Args:
        image_file: 上传的图片文件对象
    
    Returns:
        dict: 识别结果，包含重量、置信度和原始文本
    """
    # 10%概率模拟失败
    if random.random() < 0.1:
        return {
            "weight": None,
            "confidence": 0,
            "raw_text": ""
        }
    
    # 生成随机重量（50-500克之间，2位小数）
    weight = round(random.uniform(50, 500), 2)
    
    # 生成随机置信度（0.85-0.99之间）
    confidence = round(random.uniform(0.85, 0.99), 2)
    
    # 生成原始文本
    raw_text = f"{weight}g"
    
    return {
        "weight": weight,
        "confidence": confidence,
        "raw_text": raw_text
    }
