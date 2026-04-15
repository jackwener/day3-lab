"""
OCR识别路由蓝图
提供图片重量识别接口
"""
from flask import Blueprint, request

from app.services import ocr_service
from app.utils.response import success_response, error_response, INVALID_PARAM

ocr_bp = Blueprint('ocr_bp', __name__, url_prefix='/api/v1/gold/ocr')


@ocr_bp.route('/recognize', methods=['POST'])
def recognize_weight():
    """
    识别图片中的重量
    
    Form Data:
        image: 图片文件 (multipart/form-data)
    
    Returns:
        JSON: { weight, confidence, raw_text }
    """
    # 检查是否有文件上传
    if 'image' not in request.files:
        return error_response(
            message="No image file provided",
            error_code=INVALID_PARAM,
            http_status=400
        )
    
    image_file = request.files['image']
    
    # 校验文件是否存在
    if image_file.filename == '':
        return error_response(
            message="No image file selected",
            error_code=INVALID_PARAM,
            http_status=400
        )
    
    # 调用OCR服务
    result = ocr_service.recognize_weight(image_file)
    
    return success_response(data=result)
