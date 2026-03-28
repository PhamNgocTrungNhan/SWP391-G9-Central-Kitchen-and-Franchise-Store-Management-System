namespace Shop2026.DTOs
{
    public class RecipeRequest
    {
        public int ParentProductId
        {
            get; set;
        } // ID của Thành phẩm
        public int MaterialId
        {
            get; set;
        }      
        public decimal QuantityRequired
        {
            get; set;
        } 
        public decimal WasteAllowancePercent
        {
            get; set;
        } // % Hao hụt cho phép
    }
}