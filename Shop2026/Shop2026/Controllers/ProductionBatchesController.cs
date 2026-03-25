using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shop2026.DLL;
using Shop2026.DTOs;

namespace Shop2026.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN, MANAGER")]
    public class ProductionBatchesController : ControllerBase
    {
        private readonly ProductionBatchService _service;
        public ProductionBatchesController(ProductionBatchService service) => _service = service;

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var batch = _service.GetById(id);
            if (batch == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy mẻ sản xuất"
                });
            }

            return Ok(batch);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpPost]
        public IActionResult Create([FromBody] BatchCreateRequest request)
        {
            try
            {
                var newBatch = _service.CreateBatch(request); 
                return Ok(new
                {
                    message = "Tạo mẻ sản xuất thành công",
                    batchId = newBatch.BatchId 
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/status")]
        public IActionResult UpdateStatus(int id, [FromBody] BatchStatusUpdateRequest request)
        {
            try
            {
                _service.UpdateStatus(id, request);
                return Ok(new
                {
                    message = "Cập nhật trạng thái thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{id}/allocate")]
        public IActionResult Allocate(int id, [FromBody] List<BatchAllocationRequest> requests)
        {
            try
            {
                _service.AllocateBatchToOrders(id, requests);
                return Ok(new
                {
                    message = "Gán mẻ thành công"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/cancel")]
        public IActionResult Cancel(int id)
        {
            try
            {
                _service.CancelBatch(id);
                return Ok(new
                {
                    message = "Đã hủy mẻ sản xuất"
                });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}