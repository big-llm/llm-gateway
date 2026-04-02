"""
LLM Gateway Python SDK

A Python client library for LLM Gateway - multi-provider LLM gateway.
"""

import httpx
from typing import Optional, List, Dict, Any, Union, Iterator
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 1.0
    max_tokens: Optional[int] = None
    top_p: Optional[float] = 1.0
    stream: Optional[bool] = False
    stop: Optional[Union[str, List[str]]] = None


class EmbeddingRequest(BaseModel):
    model: str
    input: Union[str, List[str]]


class AnthropicMessageRequest(BaseModel):
    model: str
    messages: List[Message]
    max_tokens: int = 1024
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    stream: Optional[bool] = False


class GatewayError(Exception):
    """Base exception for gateway errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class RateLimitError(GatewayError):
    """Raised when rate limit is exceeded"""
    pass


class AuthenticationError(GatewayError):
    """Raised when authentication fails"""
    pass


class LLMGateway:
    """Python client for LLM Gateway"""
    
    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        admin_token: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 3
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.admin_token = admin_token
        self.timeout = timeout
        self.max_retries = max_retries
        
        self._client = httpx.Client(
            timeout=timeout,
            headers=self._get_headers()
        )
    
    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    def _get_admin_headers(self) -> Dict[str, str]:
        headers = self._get_headers()
        if self.admin_token:
            headers["Authorization"] = f"Bearer {self.admin_token}"
        return headers
    
    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = self._client.request(method, url, **kwargs)
            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded", 429)
            elif response.status_code == 401:
                raise AuthenticationError("Invalid API key", 401)
            elif response.status_code >= 400:
                raise GatewayError(f"Request failed: {response.text}", response.status_code)
            return response.json()
        except httpx.HTTPError as e:
            raise GatewayError(f"HTTP error: {str(e)}")
    
    @property
    def chat(self):
        """Chat completions API"""
        return ChatCompletionsAPI(self)
    
    @property
    def models(self):
        """Models API"""
        return ModelsAPI(self)
    
    @property
    def embeddings(self):
        """Embeddings API"""
        return EmbeddingsAPI(self)
    
    @property
    def messages(self):
        """Anthropic Messages API"""
        return MessagesAPI(self)
    
    @property
    def admin(self):
        """Admin API"""
        return AdminAPI(self)
    
    def close(self):
        """Close the client"""
        self._client.close()


class ChatCompletionsAPI:
    """Chat completions API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def create(
        self,
        model: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Union[Dict, Iterator]:
        """Create a chat completion"""
        data = {"model": model, "messages": messages, **kwargs}
        
        if kwargs.get("stream", False):
            return self._stream_request(data)
        
        return self.gateway._request("POST", "/v1/chat/completions", json=data)
    
    def _stream_request(self, data: Dict) -> Iterator[Dict]:
        """Handle streaming requests"""
        url = f"{self.gateway.base_url}/v1/chat/completions"
        with httpx.stream("POST", url, json=data, headers=self.gateway._get_headers()) as response:
            for line in response.iter_lines():
                if line.startswith("data: "):
                    yield line[6:]


class ModelsAPI:
    """Models API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def list(self) -> Dict:
        """List all models"""
        return self.gateway._request("GET", "/v1/models")
    
    def retrieve(self, model_id: str) -> Dict:
        """Retrieve a specific model"""
        return self.gateway._request("GET", f"/v1/models/{model_id}")


class EmbeddingsAPI:
    """Embeddings API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def create(self, model: str, input: Union[str, List[str]], **kwargs) -> Dict:
        """Create embeddings"""
        data = {"model": model, "input": input, **kwargs}
        return self.gateway._request("POST", "/v1/embeddings", json=data)


class MessagesAPI:
    """Anthropic Messages API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def create(self, model: str, messages: List[Dict[str, str]], **kwargs) -> Dict:
        """Create an Anthropic message"""
        data = {"model": model, "messages": messages, **kwargs}
        
        if kwargs.get("stream", False):
            return self._stream_request(data)
        
        return self.gateway._request("POST", "/v1/messages", json=data)
    
    def _stream_request(self, data: Dict) -> Iterator[Dict]:
        """Handle streaming requests"""
        url = f"{self.gateway.base_url}/v1/messages"
        with httpx.stream("POST", url, json=data, headers=self.gateway._get_headers()) as response:
            for line in response.iter_lines():
                if line.startswith("data: "):
                    yield line[6:]


class AdminAPI:
    """Admin API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def health(self) -> Dict:
        """Get gateway health status"""
        return self.gateway._request("GET", "/admin/health")
    
    @property
    def keys(self):
        """API keys management"""
        return AdminKeysAPI(self.gateway)
    
    @property
    def orgs(self):
        """Organizations management"""
        return AdminOrgsAPI(self.gateway)
    
    @property
    def teams(self):
        """Teams management"""
        return AdminTeamsAPI(self.gateway)
    
    @property
    def health(self):
        """Provider health"""
        return AdminHealthAPI(self.gateway)
    
    def stats(self) -> Dict:
        """Get usage statistics"""
        return self.gateway._request(
            "GET", "/admin/stats",
            headers=self.gateway._get_admin_headers()
        )


class AdminKeysAPI:
    """API Keys management"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def list(self) -> Dict:
        return self.gateway._request(
            "GET", "/admin/keys",
            headers=self.gateway._get_admin_headers()
        )
    
    def create(self, **kwargs) -> Dict:
        return self.gateway._request(
            "POST", "/admin/keys",
            json=kwargs,
            headers=self.gateway._get_admin_headers()
        )
    
    def get(self, key_id: str) -> Dict:
        return self.gateway._request(
            "GET", f"/admin/keys/{key_id}",
            headers=self.gateway._get_admin_headers()
        )
    
    def update(self, key_id: str, **kwargs) -> Dict:
        return self.gateway._request(
            "PUT", f"/admin/keys/{key_id}",
            json=kwargs,
            headers=self.gateway._get_admin_headers()
        )
    
    def delete(self, key_id: str) -> Dict:
        return self.gateway._request(
            "DELETE", f"/admin/keys/{key_id}",
            headers=self.gateway._get_admin_headers()
        )


class AdminOrgsAPI:
    """Organizations management"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def list(self) -> Dict:
        return self.gateway._request(
            "GET", "/admin/orgs",
            headers=self.gateway._get_admin_headers()
        )
    
    def create(self, **kwargs) -> Dict:
        return self.gateway._request(
            "POST", "/admin/orgs",
            json=kwargs,
            headers=self.gateway._get_admin_headers()
        )


class AdminTeamsAPI:
    """Teams management"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def list(self) -> Dict:
        return self.gateway._request(
            "GET", "/admin/teams",
            headers=self.gateway._get_admin_headers()
        )
    
    def create(self, **kwargs) -> Dict:
        return self.gateway._request(
            "POST", "/admin/teams",
            json=kwargs,
            headers=self.gateway._get_admin_headers()
        )


class AdminHealthAPI:
    """Provider health API"""
    
    def __init__(self, gateway: LLMGateway):
        self.gateway = gateway
    
    def providers(self) -> Dict:
        """Get provider health status"""
        return self.gateway._request(
            "GET", "/admin/health/providers",
            headers=self.gateway._get_admin_headers()
        )


# Convenience function
def create_gateway(
    base_url: str = "http://localhost:3000",
    api_key: Optional[str] = None,
    admin_token: Optional[str] = None
) -> LLMGateway:
    """Create an LLM Gateway instance"""
    return LLMGateway(base_url, api_key, admin_token)