"""Limites temporários por processo; sem IPs em logs ou armazenamento persistente."""
from collections import deque
from hashlib import sha256
import math
from threading import Lock
from time import monotonic

from fastapi import HTTPException


class RateLimiter:
    def __init__(self, clock=monotonic, capacity=10000):
        self.clock = clock
        self.capacity = capacity
        self.buckets = {}
        self.lock = Lock()

    def check(self, scope, identity, limit, window, record=True):
        key = (scope, sha256(identity.encode()).digest())
        with self.lock:
            now = self.clock()
            for old_key, (expires, _) in list(self.buckets.items()):
                if expires <= now:
                    del self.buckets[old_key]
            expires, hits = self.buckets.get(key, (now + window, deque()))
            while hits and hits[0] <= now - window:
                hits.popleft()
            if len(hits) >= limit:
                self.reject(max(1, math.ceil(hits[0] + window - now)))
            if record:
                if key not in self.buckets and len(self.buckets) >= self.capacity:
                    self.reject(1)
                hits.append(now)
                self.buckets[key] = (now + window, hits)

    def clear(self, scope, identity):
        with self.lock:
            self.buckets.pop((scope, sha256(identity.encode()).digest()), None)

    @staticmethod
    def reject(seconds):
        raise HTTPException(429, 'Muitas tentativas. Aguarde e tente novamente.',
                            headers={'Retry-After': str(seconds)})


def client_identity(request):
    # Cabeçalhos fornecidos pelo visitante nunca são utilizados aqui.
    return request.client.host if request.client else 'unknown'
