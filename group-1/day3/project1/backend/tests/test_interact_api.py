"""Tests for interaction API endpoints (like, favorite, rate)."""

import pytest
import json


class TestLikeEndpoint:
    """Tests for POST/DELETE /skills/<id>/like endpoint."""
    
    def test_like_skill_first_time(self, client):
        """TC-M02-090: First POST should add like and increment count."""
        response = client.post('/api/v1/hub/skills/sk_01HX001/like')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['liked'] is True
        assert data['like_count'] >= 1
        assert 'traceId' in data
        assert 'Set-Cookie' in response.headers  # Should set visitor cookie
    
    def test_like_skill_idempotent(self, client):
        """TC-M02-091: Duplicate POST should be idempotent."""
        # First like
        response1 = client.post('/api/v1/hub/skills/sk_01HX002/like')
        data1 = response1.get_json()
        count1 = data1['like_count']
        
        # Second like (should be idempotent)
        response2 = client.post('/api/v1/hub/skills/sk_01HX002/like')
        data2 = response2.get_json()
        count2 = data2['like_count']
        
        # Count should not increase
        assert count2 == count1
        assert data2['liked'] is True
    
    def test_unlike_skill(self, client):
        """TC-M02-092: DELETE should remove like."""
        # First like
        response1 = client.post('/api/v1/hub/skills/sk_01HX003/like')
        data1 = response1.get_json()
        count_after_like = data1['like_count']
        
        # Unlike
        response2 = client.delete('/api/v1/hub/skills/sk_01HX003/like')
        data2 = response2.get_json()
        
        assert response2.status_code == 200
        assert data2['liked'] is False
        assert data2['like_count'] == count_after_like - 1
    
    def test_unlike_skill_idempotent(self, client):
        """DELETE on non-liked skill should be idempotent."""
        # First unlike (without prior like)
        response = client.delete('/api/v1/hub/skills/sk_01HX004/like')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['liked'] is False
    
    def test_like_nonexistent_skill(self, client):
        """TC-M02-093: Liking non-existent skill should return 404."""
        response = client.post('/api/v1/hub/skills/sk_nonexistent/like')
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['error']['code'] == 'SKILL_NOT_FOUND'
    
    def test_like_with_existing_visitor_cookie(self, client):
        """Like with existing visitor cookie should use it."""
        # Set visitor cookie first
        client.set_cookie('hub_visitor', 'v_test123')
        
        response = client.post('/api/v1/hub/skills/sk_01HX005/like')
        
        assert response.status_code == 200


class TestFavoriteEndpoint:
    """Tests for POST/DELETE /skills/<id>/favorite endpoint."""
    
    def test_favorite_skill_first_time(self, client):
        """TC-M02-100: First POST should add favorite."""
        response = client.post('/api/v1/hub/skills/sk_01HX001/favorite')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['favorited'] is True
        assert data['favorite_count'] >= 1
    
    def test_favorite_skill_idempotent(self, client):
        """TC-M02-101: Duplicate POST should be idempotent."""
        # First favorite
        response1 = client.post('/api/v1/hub/skills/sk_01HX002/favorite')
        data1 = response1.get_json()
        count1 = data1['favorite_count']
        
        # Second favorite (should be idempotent)
        response2 = client.post('/api/v1/hub/skills/sk_01HX002/favorite')
        data2 = response2.get_json()
        
        # Count should not increase
        assert data2['favorite_count'] == count1
    
    def test_unfavorite_skill(self, client):
        """DELETE should remove favorite."""
        # First favorite
        client.post('/api/v1/hub/skills/sk_01HX003/favorite')
        
        # Unfavorite
        response = client.delete('/api/v1/hub/skills/sk_01HX003/favorite')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['favorited'] is False
    
    def test_get_my_favorites(self, client):
        """TC-M02-102: GET /me/favorites should return user's favorites."""
        # Set visitor cookie
        client.set_cookie('hub_visitor', 'v_test_fav')
        
        # Add some favorites
        client.post('/api/v1/hub/skills/sk_01HX001/favorite')
        client.post('/api/v1/hub/skills/sk_01HX002/favorite')
        
        # Get favorites
        response = client.get('/api/v1/hub/me/favorites')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data
        assert 'total' in data
        assert data['total'] >= 2
    
    def test_get_my_favorites_no_cookie(self, client):
        """TC-M02-103: GET /me/favorites without cookie should return empty."""
        response = client.get('/api/v1/hub/me/favorites')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['items'] == []
        assert data['total'] == 0


class TestRatingEndpoint:
    """Tests for POST /skills/<id>/rate endpoint."""
    
    def test_rate_skill_valid(self, client):
        """TC-M02-110: Valid rating should succeed."""
        response = client.post(
            '/api/v1/hub/skills/sk_01HX001/rate',
            json={'score': 5}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'rating_avg' in data
        assert 'rating_count' in data
        assert data['my_score'] == 5
    
    def test_rate_skill_invalid_score(self, client):
        """TC-M02-111: Invalid score should return 400."""
        response = client.post(
            '/api/v1/hub/skills/sk_01HX002/rate',
            json={'score': 6}  # Invalid: > 5
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['error']['code'] == 'INVALID_RATING'
    
    def test_rate_skill_negative_score(self, client):
        """Negative score should return 400."""
        response = client.post(
            '/api/v1/hub/skills/sk_01HX002/rate',
            json={'score': -1}
        )
        
        assert response.status_code == 400
    
    def test_rate_skill_non_integer(self, client):
        """Non-integer score should return 400."""
        response = client.post(
            '/api/v1/hub/skills/sk_01HX002/rate',
            json={'score': 3.5}
        )
        
        assert response.status_code == 400
    
    def test_rate_skill_overwrites(self, client):
        """TC-M02-112: Rating again should overwrite previous rating."""
        client.set_cookie('hub_visitor', 'v_test_rate')
        
        # First rating
        response1 = client.post(
            '/api/v1/hub/skills/sk_01HX003/rate',
            json={'score': 3}
        )
        data1 = response1.get_json()
        count1 = data1['rating_count']
        
        # Second rating (overwrite)
        response2 = client.post(
            '/api/v1/hub/skills/sk_01HX003/rate',
            json={'score': 5}
        )
        data2 = response2.get_json()
        
        assert response2.status_code == 200
        assert data2['my_score'] == 5
        # Count should not increase (it's an overwrite)
        assert data2['rating_count'] == count1
    
    def test_rate_nonexistent_skill(self, client):
        """TC-M02-113: Rating non-existent skill should return 404."""
        response = client.post(
            '/api/v1/hub/skills/sk_nonexistent/rate',
            json={'score': 4}
        )
        
        assert response.status_code == 404
        assert response.get_json()['error']['code'] == 'SKILL_NOT_FOUND'
    
    def test_rate_missing_score(self, client):
        """Missing score should return 400."""
        response = client.post(
            '/api/v1/hub/skills/sk_01HX001/rate',
            json={}
        )
        
        assert response.status_code == 400
