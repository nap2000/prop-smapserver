package model;

public class ReportColumn {
	public String column;
	public String heading;
	public int width;
	public boolean qrCode;
	
	public ReportColumn(String c, String h, int w, boolean qr) {
		column = c;
		heading = h;
		width = w;
		qrCode = qr;
	}
}
