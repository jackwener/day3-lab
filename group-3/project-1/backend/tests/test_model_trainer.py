"""Tests for src.fund_rating.model_trainer module"""

import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.fund_rating.model_trainer import ModelTrainer


class TestModelTrainerInit:
    """Tests for ModelTrainer initialization"""

    def test_init_creates_model(self):
        trainer = ModelTrainer()
        assert trainer.model is not None
        # Verify it's a RandomForest with correct params
        assert trainer.model.n_estimators == 100
        assert trainer.model.random_state == 42


class TestModelTrainerTrain:
    """Tests for ModelTrainer.train method"""

    def test_train_returns_test_data(self):
        trainer = ModelTrainer()
        # Create synthetic data
        np.random.seed(42)
        X = np.random.randn(100, 5)
        y = np.random.randn(100)

        X_test, y_test, y_pred = trainer.train(X, y)

        assert len(X_test) == 20  # 20% test split
        assert len(y_test) == 20
        assert len(y_pred) == 20

    def test_train_model_is_fitted(self):
        trainer = ModelTrainer()
        np.random.seed(42)
        X = np.random.randn(100, 5)
        y = X[:, 0] * 2 + np.random.randn(100) * 0.1

        trainer.train(X, y)

        # Model should be fitted and able to predict
        pred = trainer.predict(X[:5])
        assert len(pred) == 5

    def test_train_reproducible_split(self):
        """Test that train_test_split with random_state=42 is reproducible"""
        trainer1 = ModelTrainer()
        trainer2 = ModelTrainer()
        np.random.seed(42)
        X = np.random.randn(100, 3)
        y = np.random.randn(100)

        _, y_test1, y_pred1 = trainer1.train(X, y)
        _, y_test2, y_pred2 = trainer2.train(X, y)

        np.testing.assert_array_equal(y_test1, y_test2)
        np.testing.assert_array_almost_equal(y_pred1, y_pred2, decimal=5)


class TestModelTrainerPredict:
    """Tests for ModelTrainer.predict method"""

    def test_predict_returns_array(self):
        trainer = ModelTrainer()
        np.random.seed(42)
        X = np.random.randn(50, 3)
        y = np.random.randn(50)

        trainer.train(X, y)

        predictions = trainer.predict(X[:5])
        assert isinstance(predictions, np.ndarray)
        assert len(predictions) == 5


class TestRateFunds:
    """Tests for ModelTrainer.rate_funds method"""

    def setup_method(self):
        self.trainer = ModelTrainer()

    def test_rate_a(self):
        assert self.trainer.rate_funds(0.5) == 'A'
        assert self.trainer.rate_funds(0.6) == 'A'
        assert self.trainer.rate_funds(1.0) == 'A'

    def test_rate_b(self):
        assert self.trainer.rate_funds(0.2) == 'B'
        assert self.trainer.rate_funds(0.3) == 'B'
        assert self.trainer.rate_funds(0.49) == 'B'

    def test_rate_c(self):
        assert self.trainer.rate_funds(0.0) == 'C'
        assert self.trainer.rate_funds(0.1) == 'C'
        assert self.trainer.rate_funds(0.19) == 'C'

    def test_rate_d(self):
        assert self.trainer.rate_funds(-0.2) == 'D'
        assert self.trainer.rate_funds(-0.1) == 'D'
        assert self.trainer.rate_funds(-0.01) == 'D'

    def test_rate_e(self):
        assert self.trainer.rate_funds(-0.21) == 'E'
        assert self.trainer.rate_funds(-0.5) == 'E'
        assert self.trainer.rate_funds(-1.0) == 'E'

    def test_rate_multiple(self):
        ratios = [0.6, 0.3, 0.1, -0.1, -0.3]
        ratings = self.trainer.rate_funds(ratios)
        assert ratings == ['A', 'B', 'C', 'D', 'E']

    def test_rate_empty_list(self):
        ratings = self.trainer.rate_funds([])
        assert ratings == []

    def test_rate_boundary_values(self):
        """Test exact boundary values"""
        assert self.trainer.rate_funds(0.5) == 'A'
        assert self.trainer.rate_funds(0.2) == 'B'
        assert self.trainer.rate_funds(0.0) == 'C'
        assert self.trainer.rate_funds(-0.2) == 'D'
        # Just below boundaries
        assert self.trainer.rate_funds(0.499999) == 'B'
        assert self.trainer.rate_funds(0.199999) == 'C'
        assert self.trainer.rate_funds(-0.000001) == 'D'
        assert self.trainer.rate_funds(-0.200001) == 'E'
